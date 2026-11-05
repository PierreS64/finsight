FROM jenkins/jenkins:lts-jdk21

COPY --chown=jenkins:jenkins infrastructure/docker/jenkins-plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli -f /usr/share/jenkins/ref/plugins.txt

COPY --chown=jenkins:jenkins infrastructure/docker/jenkins-init.groovy /usr/share/jenkins/ref/init.groovy.d/01-finsight.groovy
