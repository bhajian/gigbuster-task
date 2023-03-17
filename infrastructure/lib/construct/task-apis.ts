import {Construct} from "constructs";
import {GenericDynamoTable} from "../generic/GenericDynamoTable";
import {GenericApi} from "../generic/GenericApi";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {CognitoUserPoolsAuthorizer, IResource} from "aws-cdk-lib/aws-apigateway";
import {AuthorizationType} from "@aws-cdk/aws-apigateway";
import config from "../../config/config";
import {ITable, Table} from "aws-cdk-lib/aws-dynamodb";
import {UserPool} from "aws-cdk-lib/aws-cognito";
import {Bucket} from "aws-cdk-lib/aws-s3";

export interface ApiProps {
    taskTable: GenericDynamoTable
    taskImageBucket: Bucket
}

export interface AuthorizerProps {
    id: string
    authorizerName: string
    identitySource: string
    userPoolArn: string
}

export interface TaskApiProps {
    table: Table
    bucket: Bucket
    authorizer: CognitoUserPoolsAuthorizer
    rootResource: IResource
    queryResource: IResource
    idResource: IResource,
    photoResource: IResource
    photoIdResource: IResource
    applicantResource: IResource
    applyResource: IResource
    withdrawResource: IResource
    acceptResource: IResource
    rejectResource: IResource
}

export class TaskApis extends GenericApi {
    private listApi: NodejsFunction
    private queryApi: NodejsFunction
    private getApi: NodejsFunction
    private postApi: NodejsFunction
    private putApi: NodejsFunction
    private deleteApi: NodejsFunction
    private applyApi: NodejsFunction
    private listApplicantApi: NodejsFunction
    private withdrawApi: NodejsFunction
    private acceptApi: NodejsFunction
    private rejectApi: NodejsFunction

    private addPhotoApi: NodejsFunction
    private deletePhotoApi: NodejsFunction
    private listPhotosApi: NodejsFunction
    private getPhotosApi: NodejsFunction
    private setMainPhotoApi: NodejsFunction

    public constructor(scope: Construct, id: string, props: ApiProps) {
        super(scope, id)
        this.initializeApis(props);
        this.initializeDomainName({
            certificateArn: config.apiDomainCertificateArn,
            apiSubdomain: config.apiSubdomain,
            domainNameId: 'domainNameId',
            rootDomain: config.rootDomain,
            ARecordId: 'ARecordId',
            basePath: config.basePath,
            envName: config.envName
        })
    }

    private initializeApis(props: ApiProps){
        const authorizer = this.createAuthorizer({
            id: 'userAuthorizerId',
            authorizerName: 'userAuthorizer',
            identitySource: 'method.request.header.Authorization',
            userPoolArn: config.userPoolArn
        })

        const idResource = this.api.root.addResource('{id}')
        const queryResource = this.api.root.addResource('query')
        const applicantResource = idResource.addResource('applicant')
        const applyResource = idResource.addResource('apply')
        const withdrawResource = idResource.addResource('withdraw')
        const acceptResource = idResource.addResource('accept')
        const rejectResource = idResource.addResource('reject')
        const photoResource = idResource.addResource('photo')
        const photoIdResource = photoResource.addResource('{photoId}')

        this.initializeTaskApis({
            acceptResource: acceptResource,
            applyResource: applyResource,
            applicantResource: applicantResource,
            rejectResource: rejectResource,
            withdrawResource: withdrawResource,
            photoResource: photoResource,
            photoIdResource: photoIdResource,
            authorizer: authorizer,
            idResource: idResource,
            queryResource: queryResource,
            rootResource: this.api.root,
            table: props.taskTable.table,
            bucket: props.taskImageBucket
        })

    }

    private initializeTaskApis(props: TaskApiProps){
        const profileITable = this.getProfileTable()

        this.listApi = this.addMethod({
            functionName: 'task-list',
            handlerName: 'task-list-handler.ts',
            verb: 'GET',
            resource: props.rootResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.queryApi = this.addMethod({
            functionName: 'task-query',
            handlerName: 'task-query-handler.ts',
            verb: 'GET',
            resource: props.queryResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.getApi = this.addMethod({
            functionName: 'task-get',
            handlerName: 'task-get-handler.ts',
            verb: 'GET',
            resource: props.idResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.postApi = this.addMethod({
            functionName: 'task-post',
            handlerName: 'task-post-handler.ts',
            verb: 'POST',
            resource: props.rootResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.putApi = this.addMethod({
            functionName: 'task-put',
            handlerName: 'task-put-handler.ts',
            verb: 'PUT',
            resource: props.rootResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.deleteApi = this.addMethod({
            functionName: 'task-delete',
            handlerName: 'task-delete-handler.ts',
            verb: 'DELETE',
            resource: props.idResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.listApplicantApi = this.addMethod({
            functionName: 'task-list-applicant',
            handlerName: 'task-list-applicant-handler.ts',
            verb: 'GET',
            resource: props.applicantResource,
            environment: {
                TABLE: props.table.tableName,
                PROFILE_TABLE: profileITable.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.applyApi = this.addMethod({
            functionName: 'task-apply',
            handlerName: 'task-apply-handler.ts',
            verb: 'PUT',
            resource: props.applyResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.withdrawApi = this.addMethod({
            functionName: 'task-withdraw',
            handlerName: 'task-withdraw-handler.ts',
            verb: 'PUT',
            resource: props.withdrawResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.acceptApi = this.addMethod({
            functionName: 'task-accept',
            handlerName: 'task-accept-handler.ts',
            verb: 'PUT',
            resource: props.acceptResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.rejectApi = this.addMethod({
            functionName: 'task-reject',
            handlerName: 'task-reject-handler.ts',
            verb: 'PUT',
            resource: props.rejectResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        ///////////////////

        this.listPhotosApi = this.addMethod({
            functionName: 'task-photo-list',
            handlerName: 'task-photo-list-handler.ts',
            verb: 'GET',
            resource: props.photoResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.getPhotosApi = this.addMethod({
            functionName: 'task-photo-get',
            handlerName: 'task-photo-get-handler.ts',
            verb: 'GET',
            resource: props.photoIdResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.addPhotoApi = this.addMethod({
            functionName: 'task-photo-add',
            handlerName: 'task-photo-add-handler.ts',
            verb: 'POST',
            resource: props.photoResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.deletePhotoApi = this.addMethod({
            functionName: 'task-photo-delete',
            handlerName: 'task-photo-delete-handler.ts',
            verb: 'DELETE',
            resource: props.photoIdResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.setMainPhotoApi = this.addMethod({
            functionName: 'task-photo-set-main',
            handlerName: 'task-photo-set-main-handler.ts',
            verb: 'PUT',
            resource: props.photoResource,
            environment: {
                TABLE: props.table.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        props.table.grantFullAccess(this.listApi.grantPrincipal)
        props.table.grantFullAccess(this.queryApi.grantPrincipal)
        props.table.grantFullAccess(this.getApi.grantPrincipal)
        props.table.grantFullAccess(this.postApi.grantPrincipal)
        props.table.grantFullAccess(this.putApi.grantPrincipal)
        props.table.grantFullAccess(this.deleteApi.grantPrincipal)
        props.table.grantFullAccess(this.listApplicantApi.grantPrincipal)
        props.table.grantFullAccess(this.applyApi.grantPrincipal)
        props.table.grantFullAccess(this.withdrawApi.grantPrincipal)
        props.table.grantFullAccess(this.acceptApi.grantPrincipal)
        props.table.grantFullAccess(this.rejectApi.grantPrincipal)

        props.table.grantFullAccess(this.setMainPhotoApi.grantPrincipal)
        props.table.grantFullAccess(this.addPhotoApi.grantPrincipal)
        props.table.grantFullAccess(this.deletePhotoApi.grantPrincipal)
        props.table.grantFullAccess(this.listPhotosApi.grantPrincipal)
        props.table.grantFullAccess(this.getPhotosApi.grantPrincipal)

        profileITable.grantFullAccess(this.listApplicantApi.grantPrincipal)
    }

    public getProfileTable() : ITable {
        return Table.fromTableArn(this, 'profileTableId', config.profileTableArn)
    }

    protected createAuthorizer(props: AuthorizerProps): CognitoUserPoolsAuthorizer{
        const userPool = UserPool.fromUserPoolArn(this,'userPoolId', props.userPoolArn)
        const authorizer = new CognitoUserPoolsAuthorizer(
            this,
            props.id,
            {
                cognitoUserPools: [userPool],
                authorizerName: props.authorizerName,
                identitySource: props.identitySource
            });
        authorizer._attachToApi(this.api)
        return authorizer
    }

}
