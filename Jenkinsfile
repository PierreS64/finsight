pipeline {
    agent {
        node {
            label 'windows-finsight'
            customWorkspace 'finsight-develop-v2'
        }
    }
    tools { jdk 'jdk17' }
    options { timestamps(); disableConcurrentBuilds() }
    stages {
        stage('Checkout Source') { steps { checkout scm } }
        stage('Backend Build and Tests') {
            steps { bat 'cd backend && mvnw.cmd -B -ntp verify -Pcoverage' }
            post { always { junit 'backend/target/surefire-reports/*.xml' } }
        }
        stage('Web Lint and Build') {
            steps { bat 'cd frontend\\web && npm ci && npm run lint && npm run build' }
        }
        stage('Mobile TypeScript and Expo') {
            steps { bat 'cd frontend\\mobile && npm ci && npx tsc --noEmit && npx expo-doctor' }
        }
        stage('Docker Image Build') {
            steps {
                bat 'docker build -t finsight-api:ci backend'
                bat 'docker build -t finsight-web:ci frontend\\web'
            }
        }
        stage('SonarQube Quality Gate') {
            steps {
                withCredentials([string(credentialsId: 'finsight-sonar-token', variable: 'SONAR_TOKEN')]) {
                    bat 'docker run --rm -e SONAR_HOST_URL=http://host.docker.internal:9000 -e SONAR_TOKEN -v finsight_sonar_cache:/opt/sonar-scanner/.sonar/cache -v "%CD%:/usr/src" sonarsource/sonar-scanner-cli:latest "-Dsonar.qualitygate.wait=true"'
                }
            }
        }
    }
}
