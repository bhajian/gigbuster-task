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
    transactionTable: GenericDynamoTable
    taskImageBucket: Bucket
}

export interface AuthorizerProps {
    id: string
    authorizerName: string
    identitySource: string
    userPoolArn: string
}

export interface TaskApiProps {
    taskTable: Table
    transactionTable: Table
    bucket: Bucket
    authorizer: CognitoUserPoolsAuthorizer
    rootResource: IResource
    queryResource: IResource
    idResource: IResource,
    transactionResource: IResource
    transactionRequestAcceptResource: IResource
    transactionRequestRejectResource: IResource
    transactionIdResource: IResource,
    transactionUpdateLastMessageResource: IResource
    photoResource: IResource
    photoIdResource: IResource
    applicantResource: IResource
    applyResource: IResource
    passResource: IResource
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
    private passApi: NodejsFunction
    private listApplicantApi: NodejsFunction
    private withdrawApi: NodejsFunction
    private acceptApi: NodejsFunction
    private rejectApi: NodejsFunction

    private transactionQueryApi: NodejsFunction
    private transactionPostApi: NodejsFunction
    private transactionDeleteApi: NodejsFunction
    private transactionPutApi: NodejsFunction
    private transactionRequestAcceptApi: NodejsFunction
    private transactionRequestRejectApi: NodejsFunction
    private transactionUpdateLastMessageApi: NodejsFunction

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
        const transactionResource = this.api.root.addResource('transaction')
        const transactionIdResource = transactionResource
            .addResource('{transactionId}')
        const transactionUpdateLastMessageResource = this.api.root
            .addResource('updateLastMessage')
        const transactionRequestAcceptResource = transactionResource
            .addResource('requestAccept')
        const transactionRequestRejectResource = transactionResource
            .addResource('requestReject')
        const applicantResource = idResource.addResource('applicant')
        const applyResource = idResource.addResource('apply')
        const passResource = idResource.addResource('pass')
        const withdrawResource = idResource.addResource('withdraw')
        const acceptResource = idResource.addResource('accept')
        const rejectResource = idResource.addResource('reject')
        const photoResource = idResource.addResource('photo')
        const photoIdResource = photoResource.addResource('{photoId}')

        this.initializeTaskApis({
            acceptResource: acceptResource,
            applyResource: applyResource,
            passResource: passResource,
            applicantResource: applicantResource,
            rejectResource: rejectResource,
            withdrawResource: withdrawResource,
            photoResource: photoResource,
            photoIdResource: photoIdResource,
            authorizer: authorizer,
            idResource: idResource,
            queryResource: queryResource,
            rootResource: this.api.root,
            transactionResource: transactionResource,
            transactionIdResource: transactionIdResource,
            transactionRequestAcceptResource: transactionRequestAcceptResource,
            transactionRequestRejectResource: transactionRequestRejectResource,
            transactionUpdateLastMessageResource: transactionUpdateLastMessageResource,
            taskTable: props.taskTable.table,
            transactionTable: props.transactionTable.table,
            bucket: props.taskImageBucket,
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
                TABLE: props.taskTable.tableName,
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
                TABLE: props.taskTable.tableName,
                PROFILE_TABLE: profileITable.tableName,
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
                TABLE: props.taskTable.tableName,
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
                TABLE: props.taskTable.tableName,
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
                TABLE: props.taskTable.tableName,
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
                TABLE: props.taskTable.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        ///////////////////

        this.listApplicantApi = this.addMethod({
            functionName: 'task-list-applicant',
            handlerName: 'task-list-applicant-handler.ts',
            verb: 'GET',
            resource: props.applicantResource,
            environment: {
                TASK_TABLE: props.taskTable.tableName,
                TRANSACTION_TABLE: props.transactionTable.tableName,
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
                TASK_TABLE: props.taskTable.tableName,
                TRANSACTION_TABLE: props.transactionTable.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.passApi = this.addMethod({
            functionName: 'task-pass',
            handlerName: 'task-pass-handler.ts',
            verb: 'PUT',
            resource: props.passResource,
            environment: {
                TASK_TABLE: props.taskTable.tableName,
                TRANSACTION_TABLE: props.transactionTable.tableName,
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
                TASK_TABLE: props.taskTable.tableName,
                TRANSACTION_TABLE: props.transactionTable.tableName,
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
                TASK_TABLE: props.taskTable.tableName,
                TRANSACTION_TABLE: props.transactionTable.tableName,
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
                TASK_TABLE: props.taskTable.tableName,
                TRANSACTION_TABLE: props.transactionTable.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        ///////////////////

        this.transactionQueryApi = this.addMethod({
            functionName: 'task-transaction-query',
            handlerName: 'task-transaction-query-handler.ts',
            verb: 'GET',
            resource: props.transactionResource,
            environment: {
                TASK_TABLE: props.taskTable.tableName,
                TRANSACTION_TABLE: props.transactionTable.tableName,
                PROFILE_TABLE: profileITable.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.transactionPostApi = this.addMethod({
            functionName: 'task-transaction-post',
            handlerName: 'task-transaction-post-handler.ts',
            verb: 'POST',
            resource: props.transactionResource,
            environment: {
                TASK_TABLE: props.taskTable.tableName,
                TRANSACTION_TABLE: props.transactionTable.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.transactionPutApi = this.addMethod({
            functionName: 'task-transaction-put',
            handlerName: 'task-transaction-put-handler.ts',
            verb: 'PUT',
            resource: props.transactionIdResource,
            environment: {
                TASK_TABLE: props.taskTable.tableName,
                TRANSACTION_TABLE: props.transactionTable.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.transactionRequestAcceptApi = this.addMethod({
            functionName: 'transaction-request-accept-handler',
            handlerName: 'transaction-request-accept-handler.ts',
            verb: 'PUT',
            resource: props.transactionRequestAcceptResource,
            environment: {
                TASK_TABLE: props.taskTable.tableName,
                TRANSACTION_TABLE: props.transactionTable.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.transactionRequestRejectApi = this.addMethod({
            functionName: 'transaction-request-reject-handler',
            handlerName: 'transaction-request-reject-handler.ts',
            verb: 'PUT',
            resource: props.transactionRequestRejectResource,
            environment: {
                TASK_TABLE: props.taskTable.tableName,
                TRANSACTION_TABLE: props.transactionTable.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.transactionUpdateLastMessageApi = this.addMethod({
            functionName: 'task-transaction-update-last-message-handler',
            handlerName: 'task-transaction-update-last-message-handler.ts',
            verb: 'PUT',
            resource: props.transactionUpdateLastMessageResource,
            environment: {
                TASK_TABLE: props.taskTable.tableName,
                TRANSACTION_TABLE: props.transactionTable.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        this.transactionDeleteApi = this.addMethod({
            functionName: 'task-transaction-delete',
            handlerName: 'task-transaction-delete-handler.ts',
            verb: 'DELETE',
            resource: props.transactionIdResource,
            environment: {
                TASK_TABLE: props.taskTable.tableName,
                TRANSACTION_TABLE: props.transactionTable.tableName,
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
                TABLE: props.taskTable.tableName,
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
                TABLE: props.taskTable.tableName,
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
                TABLE: props.taskTable.tableName,
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
                TABLE: props.taskTable.tableName,
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
                TABLE: props.taskTable.tableName,
                IMAGE_BUCKET: props.bucket.bucketName
            },
            validateRequestBody: false,
            authorizationType: AuthorizationType.COGNITO,
            authorizer: props.authorizer
        })

        props.taskTable.grantFullAccess(this.listApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.queryApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.getApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.postApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.putApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.deleteApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.listApplicantApi.grantPrincipal)

        props.taskTable.grantFullAccess(this.passApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.applyApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.withdrawApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.acceptApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.rejectApi.grantPrincipal)

        props.transactionTable.grantFullAccess(this.listApplicantApi.grantPrincipal)
        props.transactionTable.grantFullAccess(this.passApi.grantPrincipal)
        props.transactionTable.grantFullAccess(this.applyApi.grantPrincipal)
        props.transactionTable.grantFullAccess(this.withdrawApi.grantPrincipal)
        props.transactionTable.grantFullAccess(this.acceptApi.grantPrincipal)
        props.transactionTable.grantFullAccess(this.rejectApi.grantPrincipal)
        props.transactionTable.grantFullAccess(this.transactionRequestAcceptApi.grantPrincipal)
        props.transactionTable.grantFullAccess(this.transactionRequestRejectApi.grantPrincipal)
        props.transactionTable.grantFullAccess(this.transactionQueryApi.grantPrincipal)
        props.transactionTable.grantFullAccess(this.transactionPutApi.grantPrincipal)
        props.transactionTable.grantFullAccess(this.transactionPostApi.grantPrincipal)
        props.transactionTable.grantFullAccess(this.transactionDeleteApi.grantPrincipal)
        props.transactionTable.grantFullAccess(this.transactionUpdateLastMessageApi.grantPrincipal)

        props.taskTable.grantFullAccess(this.listApplicantApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.setMainPhotoApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.addPhotoApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.deletePhotoApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.listPhotosApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.getPhotosApi.grantPrincipal)
        props.taskTable.grantFullAccess(this.transactionQueryApi.grantPrincipal)

        profileITable.grantFullAccess(this.listApplicantApi.grantPrincipal)
        profileITable.grantFullAccess(this.queryApi.grantPrincipal)
        profileITable.grantFullAccess(this.transactionQueryApi.grantPrincipal)
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
