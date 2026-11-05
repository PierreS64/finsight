import hudson.model.JDK
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy
import hudson.security.HudsonPrivateSecurityRealm
import jenkins.model.Jenkins

def jenkins = Jenkins.get()
def marker = new File(jenkins.rootDir, '.finsight-bootstrap-complete')
if (!marker.exists()) {
    def passwordFile = new File('/run/secrets/jenkins_admin_password')
    def password = passwordFile.text.trim()
    if (!password) {
        throw new IllegalStateException('Jenkins admin password secret is empty')
    }

    def realm = new HudsonPrivateSecurityRealm(false)
    realm.createAccount('admin', password)
    jenkins.setSecurityRealm(realm)

    def authorization = new FullControlOnceLoggedInAuthorizationStrategy()
    authorization.setAllowAnonymousRead(false)
    jenkins.setAuthorizationStrategy(authorization)
    jenkins.setNumExecutors(0)

    def jdk = jenkins.getDescriptorByType(JDK.DescriptorImpl.class)
    jdk.setInstallations(new JDK('jdk17', 'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot'))

    jenkins.save()
    marker.text = 'initialized\n'
    println('FinSight Jenkins bootstrap completed')
}
