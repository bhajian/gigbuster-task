import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {join} from "path";
import config from "../../config/config";
import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";

export interface Methodprops {
    functionName: string
    handlerName: string
    environment: any
    externalModules: string[]
}

export abstract class GenericAsyncFunction extends Construct {
    protected functions = new Map<string,NodejsFunction>()

    protected constructor(scope: Construct, id: string, props?: cdk.StackProps){
    super(scope, id);
}

protected addFunction(props: Methodprops): NodejsFunction{
    const apiId = config.account + '-' + config.envName + '-' + props.functionName

    const lambda = new NodejsFunction(this, apiId, {
        entry: join(__dirname, '..', '..', '..','src', 'handler', props.handlerName),
        handler: 'handler',
        functionName: apiId,
        environment: props.environment,
        bundling: {
            externalModules: props.externalModules
        }
    })
    this.functions.set(apiId,lambda)
    return lambda;
}

public generateDocs(){
    // TODO
}

}
