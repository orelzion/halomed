// Report generator for validation results
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class ReportGenerator {
  constructor() {
    this.outputDir = './output';
  }

  async generate(reportData, config) {
    try {
      // Ensure output directory exists
      await fs.ensureDir(this.outputDir);

      // Generate JSON report
      await this.generateJsonReport(reportData);

      // Generate HTML report
      await this.generateHtmlReport(reportData);

      // Generate console summary
      this.generateConsoleSummary(reportData);

      console.log(chalk.green(`✅ Reports generated in ${this.outputDir}/`));

    } catch (error) {
      console.error(chalk.red('❌ Failed to generate reports:'), error.message);
      throw error;
    }
  }

  async generateJsonReport(reportData) {
    const jsonPath = path.join(this.outputDir, 'validation-report.json');
    
    const jsonReport = {
      ...reportData,
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    await fs.writeJson(jsonPath, jsonReport, { spaces: 2 });
    console.log(chalk.gray(`   └─ JSON report: ${jsonPath}`));
  }

  async generateHtmlReport(reportData) {
    const htmlPath = path.join(this.outputDir, 'validation-report.html');
    
    const htmlContent = this.generateHtmlContent(reportData);
    await fs.writeFile(htmlPath, htmlContent);
    
    console.log(chalk.gray(`   └─ HTML report: ${htmlPath}`));
  }

  generateHtmlContent(reportData) {
    const { summary, details, validationAreas, errors, warnings } = reportData;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Integrity Validation Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        
        .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .summary-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
        }
        
        .summary-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .card-title {
            font-size: 0.9rem;
            color: #666;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .card-value {
            font-size: 2rem;
            font-weight: bold;
            color: #333;
        }
        
        .score-perfect { color: #10b981; }
        .score-excellent { color: #3b82f6; }
        .score-good { color: #f59e0b; }
        .score-poor { color: #ef4444; }
        
        .status-pass { color: #10b981; }
        .status-fail { color: #ef4444; }
        .status-warning { color: #f59e0b; }
        
        .section {
            background: white;
            margin-bottom: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .section-header {
            background: #f8f9fa;
            padding: 1.5rem;
            border-bottom: 1px solid #e9ecef;
        }
        
        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #333;
        }
        
        .section-content {
            padding: 1.5rem;
        }
        
        .validation-area {
            margin-bottom: 2rem;
            padding: 1rem;
            border-left: 4px solid #ddd;
            background: #f9f9f9;
        }
        
        .validation-area.success {
            border-left-color: #10b981;
            background: #f0fdf4;
        }
        
        .validation-area.failure {
            border-left-color: #ef4444;
            background: #fef2f2;
        }
        
        .area-name {
            font-weight: 600;
            margin-bottom: 0.5rem;
            font-size: 1.1rem;
        }
        
        .area-status {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 0.5rem;
        }
        
        .status-badge.pass {
            background: #d1fae5;
            color: #065f46;
        }
        
        .status-badge.fail {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .metric {
            text-align: center;
        }
        
        .metric-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #333;
        }
        
        .metric-label {
            font-size: 0.8rem;
            color: #666;
        }
        
        .error-list, .warning-list {
            list-style: none;
            padding: 0;
        }
        
        .error-item, .warning-item {
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            border-radius: 4px;
        }
        
        .error-item {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
        }
        
        .warning-item {
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
        }
        
        .charts-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }
        
        .chart-wrapper {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .chart-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 1rem;
            text-align: center;
        }
        
        .user-details {
            overflow-x: auto;
        }
        
        .user-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        
        .user-table th,
        .user-table td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .user-table th {
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
        }
        
        .user-table tr:hover {
            background: #f9fafb;
        }
        
        .badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        
        .badge-success {
            background: #d1fae5;
            color: #065f46;
        }
        
        .badge-danger {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .badge-warning {
            background: #fef3c7;
            color: #92400e;
        }
        
        .footer {
            text-align: center;
            padding: 2rem;
            color: #666;
            font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .summary-grid {
                grid-template-columns: 1fr;
            }
            
            .charts-container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Data Integrity Validation Report</h1>
            <div class="subtitle">Learning Path Migration Validation</div>
            <div class="subtitle">Generated: ${new Date().toLocaleString()}</div>
        </header>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="card-title">Overall Score</div>
                <div class="card-value ${this.getScoreClass(summary.overallScore)}">${summary.overallScore}/100</div>
            </div>
            
            <div class="summary-card">
                <div class="card-title">Total Users</div>
                <div class="card-value">${summary.totalUsers}</div>
            </div>
            
            <div class="summary-card">
                <div class="card-title">Successful Validations</div>
                <div class="card-value status-pass">${summary.successfulValidations}</div>
            </div>
            
            <div class="summary-card">
                <div class="card-title">Failed Validations</div>
                <div class="card-value status-fail">${summary.failedValidations}</div>
            </div>
            
            <div class="summary-card">
                <div class="card-title">Discrepancies</div>
                <div class="card-value ${summary.discrepancies.length > 0 ? 'status-warning' : 'status-pass'}">${summary.discrepancies.length}</div>
            </div>
            
            <div class="summary-card">
                <div class="card-title">Duration</div>
                <div class="card-value">${Math.round(reportData.performance?.totalDuration / 1000)}s</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Validation Areas</h2>
            </div>
            <div class="section-content">
                ${this.generateValidationAreasHtml(validationAreas)}
            </div>
        </div>
        
        ${errors.length > 0 ? `
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Errors (${errors.length})</h2>
            </div>
            <div class="section-content">
                <ul class="error-list">
                    ${errors.map(error => `
                        <li class="error-item">
                            <strong>${error.area || 'General'}:</strong> ${error.message || error}
                            <br><small>${error.timestamp || new Date().toISOString()}</small>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
        ` : ''}
        
        ${warnings.length > 0 ? `
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Warnings (${warnings.length})</h2>
            </div>
            <div class="section-content">
                <ul class="warning-list">
                    ${warnings.map(warning => `
                        <li class="warning-item">
                            <strong>${warning.area || 'General'}:</strong> ${warning.message || warning}
                            <br><small>${warning.timestamp || new Date().toISOString()}</small>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
        ` : ''}
        
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Charts</h2>
            </div>
            <div class="section-content">
                <div class="charts-container">
                    ${this.generateChartsHtml(reportData)}
                </div>
            </div>
        </div>
        
        ${details.length > 0 ? `
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">User Details (Sample)</h2>
            </div>
            <div class="section-content">
                <div class="user-details">
                    <table class="user-table">
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>User Type</th>
                                <th>Progress</th>
                                <th>Streak</th>
                                <th>Quiz Completions</th>
                                <th>Review Completions</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${details.slice(0, 50).map(user => this.generateUserRowHtml(user)).join('')}
                        </tbody>
                    </table>
                    ${details.length > 50 ? `<p><em>Showing 50 of ${details.length} users</em></p>` : ''}
                </div>
            </div>
        </div>
        ` : ''}
        
        <footer class="footer">
            <p>Report generated by Data Integrity Validation System v1.0.0</p>
            <p>For questions or issues, please contact the development team</p>
        </footer>
    </div>
    
    <script>
        // Chart generation scripts will be inserted here
        ${this.generateChartScripts(reportData)}
    </script>
</body>
</html>`;
  }

  getScoreClass(score) {
    if (score === 100) return 'score-perfect';
    if (score >= 95) return 'score-excellent';
    if (score >= 80) return 'score-good';
    return 'score-poor';
  }

  generateValidationAreasHtml(validationAreas) {
    if (!validationAreas || Object.keys(validationAreas).length === 0) {
      return '<p>No validation areas to display.</p>';
    }

    return Object.entries(validationAreas).map(([areaName, results]) => {
      const status = results.success ? 'success' : 'failure';
      const statusText = results.success ? 'PASS' : 'FAIL';
      const statusClass = results.success ? 'pass' : 'fail';
      
      return `
        <div class="validation-area ${status}">
          <div class="area-name">${this.formatAreaName(areaName)}</div>
          <div class="area-status status-badge ${statusClass}">${statusText}</div>
          
          ${results.summary ? `
            <div class="metrics-grid">
              ${Object.entries(results.summary).map(([key, value]) => `
                <div class="metric">
                  <div class="metric-value">${value}</div>
                  <div class="metric-label">${this.formatMetricName(key)}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${results.discrepancies && results.discrepancies.length > 0 ? `
            <div style="margin-top: 1rem;">
              <strong>Discrepancies:</strong> ${results.discrepancies.length}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  generateChartsHtml(reportData) {
    return `
      <div class="chart-wrapper">
        <div class="chart-title">Validation Success Rate</div>
        <canvas id="successChart"></canvas>
      </div>
      
      <div class="chart-wrapper">
        <div class="chart-title">User Progress Distribution</div>
        <canvas id="progressChart"></canvas>
      </div>
      
      <div class="chart-wrapper">
        <div class="chart-title">Discrepancy Types</div>
        <canvas id="discrepancyChart"></canvas>
      </div>
      
      <div class="chart-wrapper">
        <div class="chart-title">Validation Area Performance</div>
        <canvas id="areaChart"></canvas>
      </div>
    `;
  }

  generateChartScripts(reportData) {
    const { summary, details, validationAreas } = reportData;
    
    return `
      // Success Rate Chart
      const successCtx = document.getElementById('successChart').getContext('2d');
      new Chart(successCtx, {
        type: 'doughnut',
        data: {
          labels: ['Successful', 'Failed'],
          datasets: [{
            data: [${summary.successfulValidations}, ${summary.failedValidations}],
            backgroundColor: ['#10b981', '#ef4444'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
      
      // Progress Distribution Chart
      const progressCtx = document.getElementById('progressChart').getContext('2d');
      const progressData = ${JSON.stringify(this.getProgressDistribution(details))};
      new Chart(progressCtx, {
        type: 'bar',
        data: {
          labels: progressData.labels,
          datasets: [{
            label: 'Number of Users',
            data: progressData.data,
            backgroundColor: '#3b82f6',
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
      
      // Discrepancy Types Chart
      const discrepancyCtx = document.getElementById('discrepancyChart').getContext('2d');
      const discrepancyData = ${JSON.stringify(this.getDiscrepancyTypes(summary.discrepancies))};
      new Chart(discrepancyCtx, {
        type: 'pie',
        data: {
          labels: discrepancyData.labels,
          datasets: [{
            data: discrepancyData.data,
            backgroundColor: [
              '#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#6366f1'
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
      
      // Validation Area Performance
      const areaCtx = document.getElementById('areaChart').getContext('2d');
      const areaData = ${JSON.stringify(this.getAreaPerformance(validationAreas))};
      new Chart(areaCtx, {
        type: 'radar',
        data: {
          labels: areaData.labels,
          datasets: [{
            label: 'Success Rate (%)',
            data: areaData.data,
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          scales: {
            r: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
    `;
  }

  getProgressDistribution(details) {
    const distribution = {
      '0': 0,
      '1-10': 0,
      '11-50': 0,
      '51-100': 0,
      '100+': 0
    };

    details.forEach(user => {
      const progress = user.current_content_index || 0;
      if (progress === 0) distribution['0']++;
      else if (progress <= 10) distribution['1-10']++;
      else if (progress <= 50) distribution['11-50']++;
      else if (progress <= 100) distribution['51-100']++;
      else distribution['100+']++;
    });

    return {
      labels: Object.keys(distribution),
      data: Object.values(distribution)
    };
  }

  getDiscrepancyTypes(discrepancies) {
    const types = {};
    discrepancies.forEach(d => {
      const type = d.type || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });

    return {
      labels: Object.keys(types),
      data: Object.values(types)
    };
  }

  getAreaPerformance(validationAreas) {
    const areas = Object.entries(validationAreas).map(([name, results]) => {
      const successRate = results.summary ? 
        parseFloat(results.summary.matchRate || results.summary.successRate || '0') : 0;
      return {
        label: this.formatAreaName(name),
        success: successRate
      };
    });

    return {
      labels: areas.map(a => a.label),
      data: areas.map(a => a.success)
    };
  }

  generateUserRowHtml(user) {
    const status = user.overallValid !== false ? 'success' : 'danger';
    const statusText = user.overallValid !== false ? 'Valid' : 'Invalid';
    
    return `
      <tr>
        <td><code>${user.userId?.substring(0, 8)}...</code></td>
        <td>${user.userType || 'unknown'}</td>
        <td>${user.current_content_index || 0}</td>
        <td>${user.streak_count || 0}</td>
        <td>${user.quiz_completion_dates?.length || 0}</td>
        <td>${user.review_completion_dates?.length || 0}</td>
        <td><span class="badge badge-${status}">${statusText}</span></td>
      </tr>
    `;
  }

  formatAreaName(areaName) {
    return areaName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  formatMetricName(metricName) {
    return metricName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  generateConsoleSummary(reportData) {
    const { summary } = reportData;
    
    console.log(chalk.blue('\n📊 VALIDATION SUMMARY'));
    console.log(chalk.gray('═'.repeat(50)));
    console.log(chalk.white(`Overall Score: ${summary.overallScore}/100`));
    console.log(chalk.white(`Total Users: ${summary.totalUsers}`));
    console.log(chalk.green(`Successful: ${summary.successfulValidations}`));
    console.log(chalk.red(`Failed: ${summary.failedValidations}`));
    
    if (summary.discrepancies.length > 0) {
      console.log(chalk.yellow(`Discrepancies: ${summary.discrepancies.length}`));
    }
    
    // Success rate
    const totalValidations = summary.successfulValidations + summary.failedValidations;
    const successRate = totalValidations > 0 ? ((summary.successfulValidations / totalValidations) * 100).toFixed(1) : 0;
    console.log(chalk.white(`Success Rate: ${successRate}%`));
    
    // Overall status
    if (summary.overallScore === 100) {
      console.log(chalk.green.bold('\n🎉 PERFECT - 100% Data Integrity Confirmed'));
    } else if (summary.overallScore >= 95) {
      console.log(chalk.green('\n✅ Excellent - Data integrity maintained'));
    } else if (summary.overallScore >= 80) {
      console.log(chalk.yellow('\n⚠️  Good - Some discrepancies found'));
    } else {
      console.log(chalk.red.bold('\n❌ Critical Issues Found'));
    }
  }
}

module.exports = ReportGenerator;