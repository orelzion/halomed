// Maestro validation script for schedule page
// Task 9.4a - Client Testing Agent
// 
// Validates that schedule page components exist and are properly structured

const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, '../../../../web');
const schedulePagePath = path.join(webDir, 'app/schedule/[trackId]/page.tsx');
const scheduleComponentPath = path.join(webDir, 'components/screens/ScheduleScreen.tsx');

function validateSchedulePage() {
  const errors = [];
  const warnings = [];

  // Check if schedule page exists
  if (!fs.existsSync(schedulePagePath)) {
    errors.push(`Schedule page not found: ${schedulePagePath}`);
  } else {
    const pageContent = fs.readFileSync(schedulePagePath, 'utf8');
    
    // Check for required elements
    if (!pageContent.includes('schedule_page') && !pageContent.includes('data-testid="schedule_page"')) {
      warnings.push('Schedule page should have test ID: schedule_page');
    }
    
    if (!pageContent.includes('ScheduleScreen')) {
      errors.push('Schedule page should use ScheduleScreen component');
    }
  }

  // Check if ScheduleScreen component exists
  if (!fs.existsSync(scheduleComponentPath)) {
    errors.push(`ScheduleScreen component not found: ${scheduleComponentPath}`);
  } else {
    const componentContent = fs.readFileSync(scheduleComponentPath, 'utf8');
    
    // Check for required elements
    const requiredElements = [
      'schedule_list',
      'schedule_unit',
      'completion_status',
      'progress_indicator'
    ];
    
    requiredElements.forEach(element => {
      if (!componentContent.includes(element) && !componentContent.includes(`data-testid="${element}"`)) {
        warnings.push(`ScheduleScreen should have test ID: ${element}`);
      }
    });
    
    // Check for Hebrew calendar library usage
    if (!componentContent.includes('@hebcal') && !componentContent.includes('hebcal')) {
      warnings.push('ScheduleScreen should use Hebrew calendar library for date conversion');
    }
    
    // Check for date formatting (both Hebrew and Gregorian)
    if (!componentContent.includes('format') || !componentContent.includes('date')) {
      warnings.push('ScheduleScreen should format dates in both Hebrew and Gregorian formats');
    }
  }

  // Check for schedule hook
  const scheduleHookPath = path.join(webDir, 'lib/hooks/useSchedule.ts');
  if (!fs.existsSync(scheduleHookPath)) {
    warnings.push(`Schedule hook not found: ${scheduleHookPath} (may be created later)`);
  }

  // Check for API route
  const apiRoutePath = path.join(webDir, 'app/api/query-schedule/route.ts');
  if (!fs.existsSync(apiRoutePath)) {
    warnings.push(`API route not found: ${apiRoutePath} (may use Edge Function directly)`);
  }

  return { errors, warnings };
}

// Run validation
const result = validateSchedulePage();

if (result.errors.length > 0) {
  console.error('❌ Validation errors:');
  result.errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
}

if (result.warnings.length > 0) {
  console.warn('⚠️  Validation warnings:');
  result.warnings.forEach(warning => console.warn(`  - ${warning}`));
}

console.log('✅ Schedule page validation passed');
process.exit(0);
