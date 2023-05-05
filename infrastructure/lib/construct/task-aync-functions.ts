import {Construct} from "constructs"
import {GenericAsyncFunction} from "../generic/GenericAsyncFunction"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {DynamoEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import {StartingPosition} from "aws-cdk-lib/aws-lambda"
import {GenericDynamoTable} from "../generic/GenericDynamoTable";
import config from "../../config/config";
import {Bucket} from "aws-cdk-lib/aws-s3";
import {ITable, Table} from "aws-cdk-lib/aws-dynamodb";

export interface ProfileAsyncProps {
    taskTable: GenericDynamoTable,
    transactionTable: GenericDynamoTable,
}

export class TaskAyncFunctions extends GenericAsyncFunction {
    transactionCreationStream: NodejsFunction
    taskUpdateStream: NodejsFunction
    props: ProfileAsyncProps

    public constructor(scope: Construct, id: string, props: ProfileAsyncProps) {
        super(scope, id)
        this.props = props
        this.initializeFunctions()
    }

    private initializeFunctions() {
        const profileTable = this.getProfileTable()
        const notificationTable = this.getNotificationTable()

        this.transactionCreationStream = this.addFunction({
            functionName: 'transaction-creation-dynamo-stream-handler',
            handlerName: 'transaction-creation-dynamo-stream-handler.ts',
            environment: {
                TASK_TABLE: this.props.taskTable.table.tableName,
                PROFILE_TABLE: profileTable.tableName,
                TRANSACTION_TABLE: this.props.transactionTable.table.tableName,
                NOTIFICATION_TABLE: notificationTable.tableName,
                EXPO_ACCESS_TOKEN: config.expoNotificationAccessToken,
            },
            externalModules: []
        })

        this.taskUpdateStream = this.addFunction({
            functionName: 'task-updated-dynamo-stream-handler',
            handlerName: 'task-updated-dynamo-stream-handler.ts',
            environment: {
                TASK_TABLE: this.props.taskTable.table.tableName,
                PROFILE_TABLE: profileTable.tableName,
                TRANSACTION_TABLE: this.props.transactionTable.table.tableName,
                NOTIFICATION_TABLE: notificationTable.tableName,
                EXPO_ACCESS_TOKEN: config.expoNotificationAccessToken,
            },
            externalModules: []
        })

        this.transactionCreationStream.addEventSource(new DynamoEventSource(
            this.props.transactionTable.table, {
                startingPosition: StartingPosition.LATEST,
            }))

        this.taskUpdateStream.addEventSource(new DynamoEventSource(
            this.props.taskTable.table, {
                startingPosition: StartingPosition.LATEST,
            }))

        profileTable.grantFullAccess(this.transactionCreationStream.grantPrincipal)
        profileTable.grantFullAccess(this.taskUpdateStream.grantPrincipal)

        notificationTable.grantFullAccess(this.transactionCreationStream.grantPrincipal)
        notificationTable.grantFullAccess(this.taskUpdateStream.grantPrincipal)

        this.props.taskTable.table.grantFullAccess(this.transactionCreationStream.grantPrincipal)
        this.props.taskTable.table.grantFullAccess(this.taskUpdateStream.grantPrincipal)

        this.props.transactionTable.table.grantFullAccess(this.transactionCreationStream.grantPrincipal)
        this.props.transactionTable.table.grantFullAccess(this.taskUpdateStream.grantPrincipal)
    }

    public getProfileTable() : ITable {
        return Table.fromTableArn(this, 'profileTableId', config.profileTableArn)
    }

    public getNotificationTable() : ITable {
        return Table.fromTableArn(this, 'notificationTableId', config.notificationTableArn)
    }
}
