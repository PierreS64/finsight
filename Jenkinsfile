pipeline {
    agent { label 'windows-finsight' }
    options { timestamps(); disableConcurrentBuilds() }
    stages {
        stage('Checkout Source') { steps { checkout scm } }
        stage('Backend Build and Tests') {
            steps { bat 'cd backend && mvnw.cmd -B -ntp verify' }
            post { always { junit 'backend/target/surefire-reports/*.xml' } }
        }
        stage('Web Lint and Build') {
            steps { bat 'cd frontend\\web && npm ci && npm run lint && npm run build' }
        }
        stage('Mobile TypeScript and Expo') {
            steps { bat 'cd frontend\\mobile && npm ci && npx tsc --noEmit && npx expo-doctor' }
        }
        stage('Docker Image Build') {
            steps { bat 'docker build -t finsight-api:ci backend' }
        }
    }
}
