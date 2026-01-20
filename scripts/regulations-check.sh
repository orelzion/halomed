#!/bin/bash
# Regulations compliance check script (runs before commits)
# Reference: @.cursor/agents/regulations.md

set -e

echo "📋 Running regulations compliance checks..."
echo ""

# Get staged files
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || echo "")
if [ -z "$STAGED_FILES" ]; then
    echo "   (No staged files - skipping regulations check)"
    echo "✅ Regulations checks passed!"
    exit 0
fi

WARNINGS=0
ERRORS=0

# Helper function to check if a file type is staged
has_staged_files() {
    local pattern="$1"
    echo "$STAGED_FILES" | grep -qE "$pattern"
}

# Check 1: Cookie consent - ensure analytics is blocked by default
echo "1. Checking cookie consent compliance..."
if has_staged_files "\.(ts|tsx)$"; then
    # Check for PostHog/analytics initialization without consent check
    ANALYTICS_FILES=$(echo "$STAGED_FILES" | grep -E "\.(ts|tsx)$" | xargs grep -l "posthog\." 2>/dev/null || true)
    for file in $ANALYTICS_FILES; do
        # Skip instrumentation file (it's the consent handler)
        if [[ "$file" == *"instrumentation"* ]]; then
            continue
        fi
        # Check if file uses posthog without checking consent
        if grep -q "posthog\.capture\|posthog\.identify" "$file" 2>/dev/null; then
            if ! grep -q "hasConsent\|consent\|opt_in" "$file" 2>/dev/null; then
                echo "⚠️  WARNING: $file uses PostHog without visible consent check"
                WARNINGS=$((WARNINGS + 1))
            fi
        fi
    done
fi

# Check 2: Accessibility - aria-hidden on decorative elements
echo "2. Checking accessibility attributes..."
if has_staged_files "\.(tsx|jsx)$"; then
    UI_FILES=$(echo "$STAGED_FILES" | grep -E "\.(tsx|jsx)$" || true)
    for file in $UI_FILES; do
        if [ -f "$file" ]; then
            # Check for SVG icons in buttons without aria-hidden
            if grep -q "<svg" "$file" 2>/dev/null; then
                if grep -q "<button" "$file" 2>/dev/null || grep -q "onClick" "$file" 2>/dev/null; then
                    if ! grep -q 'aria-hidden="true"\|aria-hidden={true}' "$file" 2>/dev/null; then
                        # Only warn if there's an SVG that might be decorative
                        SVG_COUNT=$(grep -c "<svg" "$file" 2>/dev/null || echo "0")
                        ARIA_COUNT=$(grep -c "aria-hidden" "$file" 2>/dev/null || echo "0")
                        if [ "$SVG_COUNT" -gt "$ARIA_COUNT" ]; then
                            echo "⚠️  WARNING: $file may have decorative SVGs without aria-hidden"
                            WARNINGS=$((WARNINGS + 1))
                        fi
                    fi
                fi
            fi
        fi
    done
fi

# Check 3: Touch target size - warn about small interactive elements
echo "3. Checking touch target sizes..."
if has_staged_files "\.(tsx|jsx)$"; then
    UI_FILES=$(echo "$STAGED_FILES" | grep -E "\.(tsx|jsx)$" || true)
    for file in $UI_FILES; do
        if [ -f "$file" ]; then
            # Check for potentially small touch targets (w-8, w-9, h-8, h-9 = 32-36px, should be w-11/h-11 = 44px)
            if grep -qE "w-[89]\s|h-[89]\s|w-8\"|h-8\"|w-9\"|h-9\"" "$file" 2>/dev/null; then
                if grep -q "onClick\|button\|Button\|<a\s" "$file" 2>/dev/null; then
                    echo "⚠️  WARNING: $file may have touch targets < 44px (WCAG 2.5.8)"
                    WARNINGS=$((WARNINGS + 1))
                fi
            fi
        fi
    done
fi

# Check 4: Focusable elements - interactive divs should be buttons
echo "4. Checking keyboard accessibility..."
if has_staged_files "\.(tsx|jsx)$"; then
    UI_FILES=$(echo "$STAGED_FILES" | grep -E "\.(tsx|jsx)$" || true)
    for file in $UI_FILES; do
        if [ -f "$file" ]; then
            # Check for div/span with onClick but no tabIndex/role
            if grep -qE "<div[^>]*onClick|<span[^>]*onClick" "$file" 2>/dev/null; then
                if ! grep -qE "tabIndex|role=\"button\"|<button" "$file" 2>/dev/null; then
                    echo "⚠️  WARNING: $file has clickable div/span - consider using <button> for keyboard access"
                    WARNINGS=$((WARNINGS + 1))
                fi
            fi
        fi
    done
fi

# Check 5: Privacy policy links in footer/settings
echo "5. Checking privacy policy accessibility..."
if has_staged_files "Footer\.(tsx|jsx)$|layout\.(tsx|jsx)$"; then
    LAYOUT_FILES=$(echo "$STAGED_FILES" | grep -E "Footer\.(tsx|jsx)$|layout\.(tsx|jsx)$" || true)
    for file in $LAYOUT_FILES; do
        if [ -f "$file" ]; then
            if ! grep -qE "/privacy|privacy-policy|מדיניות פרטיות" "$file" 2>/dev/null; then
                echo "⚠️  WARNING: $file may be missing privacy policy link"
                WARNINGS=$((WARNINGS + 1))
            fi
        fi
    done
fi

# Check 6: Legal pages have noindex meta
echo "6. Checking legal page SEO settings..."
if has_staged_files "legal.*page\.(tsx|jsx)$|privacy.*page|cookies.*page|accessibility.*page"; then
    LEGAL_FILES=$(echo "$STAGED_FILES" | grep -E "privacy|cookies|accessibility" | grep -E "page\.(tsx|jsx)$" || true)
    for file in $LEGAL_FILES; do
        if [ -f "$file" ]; then
            # Legal pages should have noindex for GDPR compliance (avoid indexing personal data processing info)
            if ! grep -q "noindex\|robots.*noindex" "$file" 2>/dev/null; then
                # Check parent layout too
                PARENT_LAYOUT=$(dirname "$file")/layout.tsx
                if [ -f "$PARENT_LAYOUT" ]; then
                    if ! grep -q "noindex" "$PARENT_LAYOUT" 2>/dev/null; then
                        echo "⚠️  WARNING: $file may be missing noindex meta tag"
                        WARNINGS=$((WARNINGS + 1))
                    fi
                fi
            fi
        fi
    done
fi

echo ""
if [ $ERRORS -gt 0 ]; then
    echo "❌ Regulations check failed with $ERRORS error(s) and $WARNINGS warning(s)"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "⚠️  Regulations check passed with $WARNINGS warning(s)"
    echo "   Review warnings above. Use 'git commit --no-verify' to bypass if intentional."
    # Don't fail on warnings, just inform
fi

echo "✅ Regulations checks passed!"
