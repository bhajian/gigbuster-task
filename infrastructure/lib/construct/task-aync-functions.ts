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
    cardTable: GenericDynamoTable
}

export class TaskAyncFunctions extends GenericAsyncFunction {
    transactionTableStream: NodejsFunction
    taskTableStream: NodejsFunction
    props: ProfileAsyncProps

    public constructor(scope: Construct, id: string, props: ProfileAsyncProps) {
        super(scope, id)
        this.props = props
        this.initializeFunctions()
    }

    private initializeFunctions() {
        const profileTable = this.getProfileTable()
        const notificationTable = this.getNotificationTable()

        this.transactionTableStream = this.addFunction({
            functionName: 'transaction-table-stream-handler',
            handlerName: 'transaction-table-stream-handler.ts',
            environment: {
                TASK_TABLE: this.props.taskTable.table.tableName,
                PROFILE_TABLE: profileTable.tableName,
                TRANSACTION_TABLE: this.props.transactionTable.table.tableName,
                CARD_TABLE: this.props.cardTable.table.tableName,
                NOTIFICATION_TABLE: notificationTable.tableName,
                EXPO_ACCESS_TOKEN: config.expoNotificationAccessToken,
            },
            externalModules: []
        })

        this.taskTableStream = this.addFunction({
            functionName: 'task-table-stream-handler',
            handlerName: 'task-table-stream-handler.ts',
            environment: {
                TASK_TABLE: this.props.taskTable.table.tableName,
                PROFILE_TABLE: profileTable.tableName,
                TRANSACTION_TABLE: this.props.transactionTable.table.tableName,
                CARD_TABLE: this.props.cardTable.table.tableName,
                NOTIFICATION_TABLE: notificationTable.tableName,
                EXPO_ACCESS_TOKEN: config.expoNotificationAccessToken,
            },
            externalModules: []
        })

        this.transactionTableStream.addEventSource(new DynamoEventSource(
            this.props.transactionTable.table, {
                startingPosition: StartingPosition.LATEST,
            }))

        this.taskTableStream.addEventSource(new DynamoEventSource(
            this.props.taskTable.table, {
                startingPosition: StartingPosition.LATEST,
            }))

        profileTable.grantFullAccess(this.transactionTableStream.grantPrincipal)
        profileTable.grantFullAccess(this.taskTableStream.grantPrincipal)

        notificationTable.grantFullAccess(this.transactionTableStream.grantPrincipal)
        notificationTable.grantFullAccess(this.taskTableStream.grantPrincipal)

        this.props.taskTable.table.grantFullAccess(this.transactionTableStream.grantPrincipal)
        this.props.taskTable.table.grantFullAccess(this.taskTableStream.grantPrincipal)

        this.props.transactionTable.table.grantFullAccess(this.transactionTableStream.grantPrincipal)
        this.props.transactionTable.table.grantFullAccess(this.taskTableStream.grantPrincipal)

        this.props.cardTable.table.grantFullAccess(this.transactionTableStream.grantPrincipal)
        this.props.cardTable.table.grantFullAccess(this.taskTableStream.grantPrincipal)
    }

    public getProfileTable() : ITable {
        return Table.fromTableArn(this, 'profileTableId', config.profileTableArn)
    }

    public getNotificationTable() : ITable {
        return Table.fromTableArn(this, 'notificationTableId', config.notificationTableArn)
    }
}
