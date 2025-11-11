#!/usr/bin/env node

/**
 * EC2 Server Health Check Script
 * Run this on your EC2 instance to check server status
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PORT = process.env.PORT || 5000;
const HEALTH_ENDPOINT = '/health';

// Check functions
const checks = [
  {
    name: 'Node.js Process',
    check: () => {
      try {
        const result = execSync('ps aux | grep node | grep -v grep', { encoding: 'utf8' });
        return {
          success: true,
          data: {
            processes: result.trim().split('\n').length,
            details: result.trim()
          }
        };
      } catch (error) {
        return {
          success: false,
          error: 'No Node.js processes found'
        };
      }
    }
  },
  {
    name: 'Port Listening',
    check: () => {
      try {
        const result = execSync(`netstat -tuln | grep :${PORT}`, { encoding: 'utf8' });
        return {
          success: result.includes(PORT),
          data: {
            listening: result.trim()
          }
        };
      } catch (error) {
        return {
          success: false,
          error: `Port ${PORT} is not listening`
        };
      }
    }
  },
  {
    name: 'Application Health',
    check: async () => {
      return new Promise((resolve) => {
        const options = {
          hostname: 'localhost',
          port: PORT,
          path: HEALTH_ENDPOINT,
          method: 'GET',
          timeout: 3000
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            resolve({
              success: res.statusCode === 200,
              data: {
                statusCode: res.statusCode,
                body: data.substring(0, 100)
              }
            });
          });
        });

        req.on('error', (error) => {
          resolve({
            success: false,
            error: error.message
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            success: false,
            error: 'Health check timeout'
          });
        });

        req.end();
      });
    }
  },
  {
    name: 'PM2 Status',
    check: () => {
      try {
        const result = execSync('pm2 list', { encoding: 'utf8' });
        return {
          success: result.includes('online'),
          data: {
            pm2Status: result.trim()
          }
        };
      } catch (error) {
        return {
          success: false,
          error: 'PM2 not available or no running processes'
        };
      }
    }
  },
  {
    name: 'Memory Usage',
    check: () => {
      try {
        const result = execSync('free -h', { encoding: 'utf8' });
        const lines = result.trim().split('\n');
        const memoryLine = lines.find(line => line.startsWith('Mem:'));
        
        if (memoryLine) {
          const parts = memoryLine.split(/\s+/);
          const total = parts[1];
          const used = parts[2];
          const free = parts[3];
          
          return {
            success: true,
            data: {
              total,
              used,
              free,
              usagePercent: Math.round((parseInt(used) / parseInt(total)) * 100)
            }
          };
        }
        
        return {
          success: false,
          error: 'Could not parse memory information'
        };
      } catch (error) {
        return {
          success: false,
          error: 'Unable to check memory usage'
        };
      }
    }
  },
  {
    name: 'Disk Space',
    check: () => {
      try {
        const result = execSync('df -h /', { encoding: 'utf8' });
        const lines = result.trim().split('\n');
        const dataLine = lines[1]; // Skip header
        
        if (dataLine) {
          const parts = dataLine.split(/\s+/);
          const used = parts[2];
          const available = parts[3];
          const usePercent = parts[4];
          
          return {
            success: parseInt(usePercent) < 90,
            data: {
              used,
              available,
              usePercent
            }
          };
        }
        
        return {
          success: false,
          error: 'Could not parse disk information'
        };
      } catch (error) {
        return {
          success: false,
          error: 'Unable to check disk space'
        };
      }
    }
  },
  {
    name: 'Recent Logs',
    check: () => {
      const logFiles = [
        './logs/pm2-error.log',
        './logs/pm2-out.log',
        './logs/app.log',
        '/var/log/syslog'
      ];
      
      const recentErrors = [];
      
      logFiles.forEach(logFile => {
        try {
          if (fs.existsSync(logFile)) {
            const logs = fs.readFileSync(logFile, 'utf8')
              .split('\n')
              .filter(line => line.toLowerCase().includes('error') || 
                             line.toLowerCase().includes('failed') ||
                             line.toLowerCase().includes('timeout'))
              .slice(-5); // Last 5 error lines
            
            if (logs.length > 0) {
              recentErrors.push({
                file: logFile,
                errors: logs
              });
            }
          }
        } catch (error) {
          // Ignore log read errors
        }
      });
      
      return {
        success: recentErrors.length === 0,
        data: {
          recentErrors: recentErrors.length > 0 ? recentErrors : 'No recent errors found'
        }
      };
    }
  }
];

async function runHealthCheck() {
  console.log('🏥 EC2 Server Health Check');
  console.log('=' .repeat(50));
  console.log(`Port: ${PORT}`);
  console.log(`Health Endpoint: ${HEALTH_ENDPOINT}`);
  console.log('');

  const results = [];
  
  for (const check of checks) {
    console.log(`\n🔍 Checking: ${check.name}`);
    console.log('-'.repeat(30));
    
    try {
      const result = await check.check();
      results.push({
        name: check.name,
        ...result
      });
      
      if (result.success) {
        console.log(`✅ ${check.name}: HEALTHY`);
        if (result.data) {
          console.log('   Data:', JSON.stringify(result.data, null, 2));
        }
      } else {
        console.log(`❌ ${check.name}: ISSUE DETECTED`);
        console.log(`   Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ${check.name}: CHECK FAILED`);
      console.log(`   Exception: ${error.message}`);
      results.push({
        name: check.name,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n📊 Health Summary');
  console.log('=' .repeat(50));
  
  const healthyChecks = results.filter(r => r.success).length;
  const totalChecks = results.length;
  
  console.log(`Healthy: ${healthyChecks}/${totalChecks}`);
  console.log(`Health Score: ${Math.round((healthyChecks / totalChecks) * 100)}%`);
  
  // Critical issues
  const criticalIssues = results.filter(r => 
    !r.success && (
      r.name === 'Node.js Process' ||
      r.name === 'Port Listening' ||
      r.name === 'Application Health'
    )
  );
  
  if (criticalIssues.length > 0) {
    console.log('\n🚨 Critical Issues Found:');
    criticalIssues.forEach(issue => {
      console.log(`   - ${issue.name}: ${issue.error}`);
    });
    
    console.log('\n🔧 Immediate Actions Required:');
    console.log('1. Check if your Node.js application is running');
    console.log('2. Restart your application: pm2 restart all');
    console.log('3. Check application logs: pm2 logs');
    console.log('4. Verify port configuration in your app');
    console.log('5. Check if the application crashed due to errors');
  } else {
    console.log('\n✅ No critical issues detected');
    console.log('Your server appears to be running normally');
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  console.log('- Monitor memory usage regularly');
  console.log('- Check disk space periodically');
  console.log('- Review application logs for warnings');
  console.log('- Set up automated health monitoring');
  
  return results;
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node checkServerHealth.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --port <port>      Specify application port (default: 5000)');
    console.log('  --help, -h         Show this help message');
    console.log('');
    console.log('This script checks your EC2 server health and identifies issues');
    console.log('that could cause CloudFront 504 errors.');
    process.exit(0);
  }
  
  if (args.includes('--port') && args[args.indexOf('--port') + 1]) {
    process.env.PORT = args[args.indexOf('--port') + 1];
  }
  
  runHealthCheck().catch(console.error);
}

module.exports = { runHealthCheck };