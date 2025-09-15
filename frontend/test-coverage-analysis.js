#!/usr/bin/env node

/**
 * Test Coverage Analysis Tool
 * Comprehensive coverage reporting and analysis for Real Estate CRM
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CoverageAnalyzer {
  constructor() {
    this.coverageDir = path.join(__dirname, 'coverage');
    this.coverageFile = path.join(this.coverageDir, 'coverage-final.json');
    this.srcDir = path.join(__dirname, 'src');
    this.thresholds = {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    };
  }

  /**
   * Run coverage analysis
   */
  async analyze() {
    console.log('🔍 Starting Test Coverage Analysis...\n');

    try {
      // Generate coverage data
      await this.generateCoverage();

      // Load and analyze coverage data
      const coverageData = this.loadCoverageData();

      // Generate comprehensive report
      const report = this.generateReport(coverageData);

      // Display results
      this.displayReport(report);

      // Save detailed report
      this.saveReport(report);

      console.log('\n✅ Coverage analysis completed successfully!');
      console.log(`📊 Detailed report saved to: coverage/coverage-report.json`);

    } catch (error) {
      console.error('❌ Coverage analysis failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Generate coverage data by running tests
   */
  async generateCoverage() {
    console.log('📊 Generating coverage data...');

    try {
      // Clean previous coverage
      if (fs.existsSync(this.coverageDir)) {
        fs.rmSync(this.coverageDir, { recursive: true, force: true });
      }

      // Run tests with coverage
      execSync('npm run test:coverage', {
        stdio: 'inherit',
        cwd: __dirname
      });

      console.log('✅ Coverage data generated successfully');
    } catch (error) {
      console.log('⚠️  Some tests failed, but coverage data was generated');
    }
  }

  /**
   * Load coverage data from JSON file
   */
  loadCoverageData() {
    if (!fs.existsSync(this.coverageFile)) {
      throw new Error('Coverage file not found. Run tests with coverage first.');
    }

    const coverageData = JSON.parse(fs.readFileSync(this.coverageFile, 'utf8'));
    console.log('📋 Coverage data loaded successfully');
    return coverageData;
  }

  /**
   * Generate comprehensive coverage report
   */
  generateReport(coverageData) {
    const report = {
      summary: this.calculateSummary(coverageData),
      byFile: this.analyzeByFile(coverageData),
      byDirectory: this.analyzeByDirectory(coverageData),
      uncoveredLines: this.findUncoveredLines(coverageData),
      recommendations: this.generateRecommendations(coverageData),
      metadata: {
        generatedAt: new Date().toISOString(),
        totalFiles: Object.keys(coverageData).length,
        testCommand: 'npm run test:coverage'
      }
    };

    return report;
  }

  /**
   * Calculate overall coverage summary
   */
  calculateSummary(coverageData) {
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;

    Object.values(coverageData).forEach(fileData => {
      totalStatements += fileData.s || 0;
      coveredStatements += Object.values(fileData.statementMap || {}).reduce((sum, stmt) => {
        return sum + (stmt.s ? 1 : 0);
      }, 0);

      totalBranches += fileData.b ? Object.keys(fileData.b).length : 0;
      coveredBranches += fileData.b ? Object.values(fileData.b).reduce((sum, branch) => {
        return sum + branch.filter(hit => hit > 0).length;
      }, 0) : 0;

      totalFunctions += fileData.f ? Object.keys(fileData.f).length : 0;
      coveredFunctions += fileData.f ? Object.values(fileData.f).filter(hits => hits > 0).length : 0;

      totalLines += fileData.l ? Object.keys(fileData.l).length : 0;
      coveredLines += fileData.l ? Object.values(fileData.l).filter(hits => hits > 0).length : 0;
    });

    return {
      statements: {
        covered: coveredStatements,
        total: totalStatements,
        percentage: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0
      },
      branches: {
        covered: coveredBranches,
        total: totalBranches,
        percentage: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0
      },
      functions: {
        covered: coveredFunctions,
        total: totalFunctions,
        percentage: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0
      },
      lines: {
        covered: coveredLines,
        total: totalLines,
        percentage: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0
      },
      overall: {
        percentage: Math.round(
          (this.calculateWeightedAverage([
            { value: coveredStatements, total: totalStatements, weight: 0.4 },
            { value: coveredBranches, total: totalBranches, weight: 0.3 },
            { value: coveredFunctions, total: totalFunctions, weight: 0.2 },
            { value: coveredLines, total: totalLines, weight: 0.1 }
          ])) * 100
        )
      }
    };
  }

  /**
   * Calculate weighted average for overall score
   */
  calculateWeightedAverage(metrics) {
    let weightedSum = 0;
    let totalWeight = 0;

    metrics.forEach(metric => {
      if (metric.total > 0) {
        weightedSum += (metric.value / metric.total) * metric.weight;
        totalWeight += metric.weight;
      }
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Analyze coverage by individual file
   */
  analyzeByFile(coverageData) {
    const fileAnalysis = {};

    Object.entries(coverageData).forEach(([filePath, fileData]) => {
      const relativePath = path.relative(this.srcDir, filePath);
      const directory = path.dirname(relativePath);

      fileAnalysis[relativePath] = {
        directory,
        statements: this.calculateFileCoverage(fileData, 's'),
        branches: this.calculateFileCoverage(fileData, 'b'),
        functions: this.calculateFileCoverage(fileData, 'f'),
        lines: this.calculateFileCoverage(fileData, 'l'),
        overall: this.calculateFileOverall(fileData)
      };
    });

    return fileAnalysis;
  }

  /**
   * Calculate coverage for a specific metric in a file
   */
  calculateFileCoverage(fileData, metric) {
    if (!fileData[metric]) return { covered: 0, total: 0, percentage: 0 };

    let covered = 0;
    let total = 0;

    if (metric === 's') {
      // Statements
      total = Object.keys(fileData.statementMap || {}).length;
      covered = Object.values(fileData.s || {}).filter(hits => hits > 0).length;
    } else if (metric === 'b') {
      // Branches
      total = Object.values(fileData.b || {}).reduce((sum, branches) => sum + branches.length, 0);
      covered = Object.values(fileData.b || {}).reduce((sum, branches) =>
        sum + branches.filter(hit => hit > 0).length, 0);
    } else if (metric === 'f') {
      // Functions
      total = Object.keys(fileData.f || {}).length;
      covered = Object.values(fileData.f || {}).filter(hits => hits > 0).length;
    } else if (metric === 'l') {
      // Lines
      total = Object.keys(fileData.l || {}).length;
      covered = Object.values(fileData.l || {}).filter(hits => hits > 0).length;
    }

    return {
      covered,
      total,
      percentage: total > 0 ? Math.round((covered / total) * 100) : 0
    };
  }

  /**
   * Calculate overall coverage for a file
   */
  calculateFileOverall(fileData) {
    const metrics = ['s', 'b', 'f', 'l'];
    const percentages = metrics.map(metric => this.calculateFileCoverage(fileData, metric).percentage);
    const validPercentages = percentages.filter(p => !isNaN(p) && p >= 0);

    if (validPercentages.length === 0) return 0;

    return Math.round(validPercentages.reduce((sum, p) => sum + p, 0) / validPercentages.length);
  }

  /**
   * Analyze coverage by directory
   */
  analyzeByDirectory(coverageData) {
    const dirAnalysis = {};
    const fileAnalysis = this.analyzeByFile(coverageData);

    Object.entries(fileAnalysis).forEach(([filePath, fileData]) => {
      const directory = fileData.directory;

      if (!dirAnalysis[directory]) {
        dirAnalysis[directory] = {
          files: [],
          statements: { covered: 0, total: 0 },
          branches: { covered: 0, total: 0 },
          functions: { covered: 0, total: 0 },
          lines: { covered: 0, total: 0 }
        };
      }

      dirAnalysis[directory].files.push(filePath);
      ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
        dirAnalysis[directory][metric].covered += fileData[metric].covered;
        dirAnalysis[directory][metric].total += fileData[metric].total;
      });
    });

    // Calculate percentages for directories
    Object.values(dirAnalysis).forEach(dirData => {
      ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
        const data = dirData[metric];
        data.percentage = data.total > 0 ? Math.round((data.covered / data.total) * 100) : 0;
      });
    });

    return dirAnalysis;
  }

  /**
   * Find uncovered lines across all files
   */
  findUncoveredLines(coverageData) {
    const uncovered = {};

    Object.entries(coverageData).forEach(([filePath, fileData]) => {
      const relativePath = path.relative(this.srcDir, filePath);
      const uncoveredLines = [];

      // Check statements
      if (fileData.s && fileData.statementMap) {
        Object.entries(fileData.s).forEach(([stmtId, hits]) => {
          if (hits === 0 && fileData.statementMap[stmtId]) {
            const location = fileData.statementMap[stmtId];
            uncoveredLines.push({
              line: location.start.line,
              type: 'statement',
              code: this.extractCodeSnippet(filePath, location.start.line)
            });
          }
        });
      }

      if (uncoveredLines.length > 0) {
        uncovered[relativePath] = uncoveredLines;
      }
    });

    return uncovered;
  }

  /**
   * Extract code snippet from file
   */
  extractCodeSnippet(filePath, lineNumber) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const start = Math.max(0, lineNumber - 2);
      const end = Math.min(lines.length, lineNumber + 2);
      return lines.slice(start, end).join('\n');
    } catch (error) {
      return 'Unable to extract code snippet';
    }
  }

  /**
   * Generate coverage recommendations
   */
  generateRecommendations(coverageData) {
    const recommendations = [];
    const summary = this.calculateSummary(coverageData);

    // Check against thresholds
    Object.entries(this.thresholds).forEach(([metric, threshold]) => {
      const actual = summary[metric].percentage;
      if (actual < threshold) {
        recommendations.push({
          type: 'threshold',
          metric,
          current: actual,
          target: threshold,
          priority: actual < threshold - 20 ? 'high' : 'medium',
          suggestion: `Increase ${metric} coverage from ${actual}% to ${threshold}%`
        });
      }
    });

    // Find files with low coverage
    const fileAnalysis = this.analyzeByFile(coverageData);
    const lowCoverageFiles = Object.entries(fileAnalysis)
      .filter(([_, data]) => data.overall < 50)
      .sort((a, b) => a[1].overall - b[1].overall)
      .slice(0, 5);

    lowCoverageFiles.forEach(([filePath, data]) => {
      recommendations.push({
        type: 'file',
        file: filePath,
        coverage: data.overall,
        priority: data.overall < 20 ? 'high' : 'medium',
        suggestion: `Add tests for ${filePath} (currently ${data.overall}% coverage)`
      });
    });

    // Check for uncovered critical paths
    const uncoveredLines = this.findUncoveredLines(coverageData);
    const filesWithManyUncovered = Object.entries(uncoveredLines)
      .filter(([_, lines]) => lines.length > 10)
      .slice(0, 3);

    filesWithManyUncovered.forEach(([filePath, lines]) => {
      recommendations.push({
        type: 'uncovered',
        file: filePath,
        uncoveredLines: lines.length,
        priority: 'medium',
        suggestion: `Review ${lines.length} uncovered lines in ${filePath}`
      });
    });

    return recommendations;
  }

  /**
   * Display coverage report in console
   */
  displayReport(report) {
    console.log('\n📊 COVERAGE ANALYSIS REPORT');
    console.log('='.repeat(50));

    // Summary
    console.log('\n🎯 OVERALL COVERAGE SUMMARY:');
    console.log(`   Statements: ${report.summary.statements.percentage}% (${report.summary.statements.covered}/${report.summary.statements.total})`);
    console.log(`   Branches:   ${report.summary.branches.percentage}% (${report.summary.branches.covered}/${report.summary.branches.total})`);
    console.log(`   Functions:  ${report.summary.functions.percentage}% (${report.summary.functions.covered}/${report.summary.functions.total})`);
    console.log(`   Lines:      ${report.summary.lines.percentage}% (${report.summary.lines.covered}/${report.summary.lines.total})`);
    console.log(`   Overall:    ${report.summary.overall.percentage}%`);

    // Threshold status
    console.log('\n📏 THRESHOLD COMPLIANCE:');
    Object.entries(this.thresholds).forEach(([metric, threshold]) => {
      const actual = report.summary[metric].percentage;
      const status = actual >= threshold ? '✅' : '❌';
      console.log(`   ${metric}: ${status} ${actual}% (target: ${threshold}%)`);
    });

    // Top uncovered files
    const lowCoverageFiles = Object.entries(report.byFile)
      .sort((a, b) => a[1].overall - b[1].overall)
      .slice(0, 5);

    if (lowCoverageFiles.length > 0) {
      console.log('\n📂 LOWEST COVERAGE FILES:');
      lowCoverageFiles.forEach(([file, data]) => {
        console.log(`   ${file}: ${data.overall}%`);
      });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.slice(0, 5).forEach(rec => {
        const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`   ${priority} ${rec.suggestion}`);
      });

      if (report.recommendations.length > 5) {
        console.log(`   ... and ${report.recommendations.length - 5} more recommendations`);
      }
    }
  }

  /**
   * Save detailed report to file
   */
  saveReport(report) {
    const reportPath = path.join(this.coverageDir, 'coverage-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }
}

// CLI interface
if (require.main === module) {
  const analyzer = new CoverageAnalyzer();
  analyzer.analyze().catch(error => {
    console.error('Analysis failed:', error);
    process.exit(1);
  });
}

module.exports = CoverageAnalyzer;