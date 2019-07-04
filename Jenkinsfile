
@Library('kaltura')_

pipeline {

    agent { 
        label 'Ubuntu'
    }
    environment {
        version = sh(script: 'cat package.json | grep version | head -1 | awk -F: \'{ print $2 }\' | sed \'s/[",]//g\' | sed \'s/^ *//;s/ *$//\'', returnStdout: true).trim()
    }

    stages { 
        stage('Build') {
            steps {
                script {
                    env.DOCKER_BUILD_TAG = UUID.randomUUID().toString()
                    docker.build("watch-tcm:$DOCKER_BUILD_TAG", "--build-arg VERSION=$version .")
                }
            }
        }
        stage('Deploy') {
            steps {
                deploy('watch-tcm', "$version")
            }
        }
    }
}