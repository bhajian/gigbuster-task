
const configFile = require('./dev.json')
interface Env {
    envName: string | undefined
    account: string | undefined
    region: string | undefined
    apiDomainCertificateArn: string | undefined
    rootDomain: string | undefined
    apiSubdomain: string | undefined
    userPoolArn: string | undefined
    basePath: string | undefined
    authenticatedRoleArn: string | undefined
    unauthenticatedRoleArn: string | undefined
    adminRoleArn: string | undefined
    profileTableArn: string | undefined
    notificationTableArn: string | undefined
}

interface AppConfig {
    envName: string
    account: string
    region: string
    apiDomainCertificateArn: string
    rootDomain: string
    apiSubdomain: string
    userPoolArn: string
    basePath: string
    authenticatedRoleArn: string
    unauthenticatedRoleArn: string
    adminRoleArn: string
    profileTableArn: string
    notificationTableArn: string
}

const getConfig = (): Env => {
    return {
        envName: configFile.envName ? configFile.envName : 'dev' ,
        account: configFile.account ? configFile.account : 'dev' ,
        region: configFile.region ? configFile.region : 'us-east-1' ,
        apiDomainCertificateArn: configFile.apiDomainCertificateArn,
        rootDomain: configFile.rootDomain,
        apiSubdomain: configFile.apiSubdomain,
        userPoolArn: configFile.userPoolArn,
        basePath: configFile.basePath,
        authenticatedRoleArn: configFile.authenticatedRoleArn,
        unauthenticatedRoleArn: configFile.unauthenticatedRoleArn,
        adminRoleArn: configFile.adminRoleArn,
        profileTableArn: configFile.profileTableArn,
        notificationTableArn: configFile.notificationTableArn
    }
};

const getSanitzedConfig = (config: Env): AppConfig => {
    for (const [key, value] of Object.entries(config)) {
        if (value === undefined) {
            throw new Error(`Missing key ${key} in config file`);
        }
    }
    return config as AppConfig;
};

const sanitizedConfig = getSanitzedConfig(getConfig());

export default sanitizedConfig;
