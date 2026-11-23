pipeline {
  agent { label 'rootless-docker' }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Build images') {
      steps { sh 'docker compose build' }
    }
    stage('Start stack') {
      steps {
        sh 'docker compose down --remove-orphans || true'
        sh 'docker compose up -d'
      }
    }
    stage('Smoke test') {
      steps {
        sh '''
          for i in $(seq 1 20); do
            if curl -fs http://localhost:3000 > /dev/null; then
              echo "Frontend OK"; break
            fi
            sleep 3
          done
          curl -fs http://localhost:3000 > /dev/null
          docker compose logs backend | grep "API running"
        '''
      }
    }
  }

  post {
    always {
      sh 'docker compose logs || true'
      sh 'docker compose down -v || true'
    }
  }
}

