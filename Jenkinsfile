pipeline {
    agent {
        docker {
            image 'node:20-alpine'
            args '-u root'
        }
    }

    environment {
        CI          = 'true'
        NODE_ENV    = 'test'
        npm_config_cache = "${WORKSPACE}/.npm-cache"
    }

    options {
        timeout(time: 15, unit: 'MINUTES')
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci --prefer-offline'
            }
        }

        stage('Quality') {
            parallel {
                stage('Lint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
                stage('Type Check') {
                    steps {
                        sh 'npx tsc --noEmit'
                    }
                }
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test:coverage'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo '🚀 Deploy stage — placeholder for production deployment'
                echo 'TODO: Add deployment steps (e.g., rsync, Docker push, Vercel deploy, etc.)'
            }
        }
    }

    post {
        always {
            // Publish HTML coverage report
            publishHTML(target: [
                allowMissing         : true,
                alwaysLinkToLastBuild: true,
                keepAll              : true,
                reportDir            : 'coverage',
                reportFiles          : 'index.html',
                reportName           : 'Coverage Report',
                reportTitles         : 'Test Coverage'
            ])

            // Publish JUnit test results
            junit(
                testResults: 'test-results/junit.xml',
                allowEmptyResults: true
            )
        }

        failure {
            echo '❌ Pipeline failed! Check the logs above for details.'
            echo 'TODO: Add Slack/Teams/Email notification here'
        }

        success {
            echo '✅ Pipeline completed successfully!'
        }
    }
}
