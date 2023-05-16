import {Construct} from "constructs"
import {GenericAsyncFunction} from "../generic/GenericAsyncFunction"
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {DynamoEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import {StartingPosition} from "aws-cdk-lib/aws-lambda"
import {GenericDynamoTable} from "../generic/GenericDynamoTable";
import config from "../../config/config";
import {ITable, Table} from "aws-cdk-lib/aws-dynamodb";

export interface ProfileAsyncProps {
    taskTable: GenericDynamoTable,
    transactionTable: GenericDynamoTable,
    cardTable: GenericDynamoTable
}

export class TaskAyncFunctions extends GenericAsyncFunction {
    taskTableStream: NodejsFunction
    profileTableStream: NodejsFunction
    props: ProfileAsyncProps

    public constructor(scope: Construct, id: string, props: ProfileAsyncProps) {
        super(scope, id)
        this.props = props
        this.initializeFunctions()
    }

    private initializeFunctions() {
        const profileTable = this.getProfileTable()

        this.taskTableStream = this.addFunction({
            functionName: 'task-table-stream-handler',
            handlerName: 'task-table-stream-handler.ts',
            environment: {
                TASK_TABLE: this.props.taskTable.table.tableName,
                PROFILE_TABLE: profileTable.tableName,
                TRANSACTION_TABLE: this.props.transactionTable.table.tableName,
                CARD_TABLE: this.props.cardTable.table.tableName,
            },
            externalModules: []
        })

        this.profileTableStream = this.addFunction({
            functionName: 'profile-table-stream-handler',
            handlerName: 'profile-table-stream-handler.ts',
            environment: {
                TASK_TABLE: this.props.taskTable.table.tableName,
                PROFILE_TABLE: profileTable.tableName,
                TRANSACTION_TABLE: this.props.transactionTable.table.tableName,
                CARD_TABLE: this.props.cardTable.table.tableName,
            },
            externalModules: []
        })

        this.taskTableStream.addEventSource(new DynamoEventSource(
            this.props.taskTable.table, {
                startingPosition: StartingPosition.LATEST,
            }))

        this.profileTableStream.addEventSource(new DynamoEventSource(
            profileTable, {
                startingPosition: StartingPosition.LATEST,
            }))

        profileTable.grantFullAccess(this.taskTableStream.grantPrincipal)
        profileTable.grantFullAccess(this.profileTableStream.grantPrincipal)

        this.props.taskTable.table.grantFullAccess(this.taskTableStream.grantPrincipal)
        this.props.taskTable.table.grantFullAccess(this.profileTableStream.grantPrincipal)

        this.props.transactionTable.table.grantFullAccess(this.taskTableStream.grantPrincipal)
        this.props.transactionTable.table.grantFullAccess(this.profileTableStream.grantPrincipal)

        this.props.cardTable.table.grantFullAccess(this.taskTableStream.grantPrincipal)
        this.props.cardTable.table.grantFullAccess(this.profileTableStream.grantPrincipal)
    }

    public getProfileTable() : ITable {
        return Table.fromTableAttributes(this, 'profileTableId', {
            tableArn: config.profileTableArn,
            tableStreamArn: config.profileTableArnStream
        })
    }

}
