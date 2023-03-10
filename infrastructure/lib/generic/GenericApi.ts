import {
    AuthorizationType,
    JsonSchema,
    LambdaIntegration,
    Model,
    RequestValidator,
    RestApi,
    DomainName, BasePathMapping, Cors, IResource,
} from "aws-cdk-lib/aws-apigateway";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {join} from "path";
import config from "../../config/config";
import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import {Authorizer} from "aws-cdk-lib/aws-apigateway/lib/authorizer";

export interface Methodprops {
    functionName: string
    handlerName: string
    verb: string
    resource: IResource
    environment: any
    bodySchema?: JsonSchema
    validateRequestBody: boolean
    authorizationType?: AuthorizationType
    authorizer?: Authorizer
}
export interface DomainNameProps {
    certificateArn: string
    apiSubdomain: string
    domainNameId: string
    rootDomain: string
    ARecordId: string
    basePath: string
    envName: string
}

export abstract class GenericApi extends Construct {
    public lambdaIntegration: LambdaIntegration;
    protected api: RestApi
    protected functions = new Map<string,NodejsFunction>()
    protected model: Model
    protected requestValidator: RequestValidator

    protected constructor(scope: Construct, id: string, props?: cdk.StackProps){
        super(scope, id);
        this.api = new RestApi(this, id, {
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS,
                allowMethods: Cors.ALL_METHODS,
                allowHeaders: Cors.DEFAULT_HEADERS
            }})
    }

    protected initializeDomainName(props: DomainNameProps){
        const domainName = DomainName.fromDomainNameAttributes(
            this, 'domainNameId', {
                domainName: [props.apiSubdomain, props.envName, props.rootDomain].join('.'),
                domainNameAliasHostedZoneId: "",
                domainNameAliasTarget: ""
            })

        new BasePathMapping(this,
        'basePath-mapping-id', {
            basePath: props.basePath,
            domainName: domainName,
            restApi: this.api
        })
    }

    protected addMethod(props: Methodprops): NodejsFunction{
        const apiId = `${config.envName}-${props.functionName}`
        let options: any = {}

        if(props.authorizationType && props.authorizer){
            options.authorizationType = props.authorizationType
            options.authorizer = {
                authorizerId: props.authorizer.authorizerId
            }
        }

        if(props.validateRequestBody && props.bodySchema){
            this.model = new Model(this, apiId + '-model-validator',
                {
                restApi: this.api,
                contentType: "application/json",
                description: "To validate the request body",
                schema: props.bodySchema
            })
            this.requestValidator = new RequestValidator(this, apiId + '-body-validator',
                {
                restApi: this.api,
                validateRequestBody: props.validateRequestBody,
            })
            options.requestValidator = this.requestValidator
            options.requestModels = {
                "application/json": this.model,
            }
        }

        const lambda = new NodejsFunction(this, apiId, {
            entry: join(__dirname, '..', '..', '..','src', 'handler', props.handlerName),
            handler: 'handler',
            functionName: apiId,
            environment: props.environment
        })
        this.functions.set(apiId,lambda)
        this.lambdaIntegration = new LambdaIntegration(lambda)
        props.resource.addMethod(props.verb, this.lambdaIntegration, options)
        return lambda;
    }

    public generateDocs(){
        // TODO
    }

}
