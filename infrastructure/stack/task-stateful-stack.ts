import * as cdk from 'aws-cdk-lib';
import {CfnOutput, Fn, RemovalPolicy, Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {GenericDynamoTable} from "../lib/generic/GenericDynamoTable";
import {AttributeType, StreamViewType} from "aws-cdk-lib/aws-dynamodb";
import config from "../config/config";
import {Bucket, HttpMethods} from "aws-cdk-lib/aws-s3";
import {Effect, PolicyStatement, Role} from "aws-cdk-lib/aws-iam";


export class TaskStatefulStack extends Stack {
    public dynamodbTable: GenericDynamoTable
    public taskImageBucket: Bucket
    private suffix: string;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        this.initializeSuffix()
        this.initializeDynamoDBTable()
        this.initializeTaskPhotosBucket()
        this.initializeBucketPolicies()
    }

    private initializeSuffix() {
        const shortStackId = Fn.select(2, Fn.split('/', this.stackId));
        const Suffix = Fn.select(4, Fn.split('-', shortStackId));
        this.suffix = Suffix;
    }

    private initializeDynamoDBTable() {
        this.dynamodbTable = new GenericDynamoTable(this,
            'TaskDynamoDBTable', {
            removalPolicy: RemovalPolicy.DESTROY,
            tableName: `Task-${config.envName}-${this.suffix}`,
            stream: StreamViewType.NEW_AND_OLD_IMAGES,
            primaryKey: 'id',
            keyType: AttributeType.STRING
        })
        this.dynamodbTable.addGlobalSecondaryIndexes({
            indexName: 'userIdIndex',
            partitionKeyName: 'userId',
            partitionKeyType: AttributeType.STRING,
        })
        this.dynamodbTable.addGlobalSecondaryIndexes({
            indexName: 'categoryIndex',
            partitionKeyName: 'category',
            partitionKeyType: AttributeType.STRING,
        })
        this.dynamodbTable.addGlobalSecondaryIndexes({
            indexName: 'locationIndex',
            partitionKeyName: 'city',
            partitionKeyType: AttributeType.STRING,
        })
    }

    private initializeTaskPhotosBucket() {
        this.taskImageBucket = new Bucket(this, 'task-image', {
            removalPolicy: RemovalPolicy.DESTROY,
            bucketName: `task-image-${config.envName}-${this.suffix}`,
            cors: [{
                allowedMethods: [
                    HttpMethods.HEAD,
                    HttpMethods.GET,
                    HttpMethods.PUT
                ],
                allowedOrigins: ['*'],
                allowedHeaders: ['*']
            }]
        });
        new CfnOutput(this, 'task-image-bucket-name', {
            value: this.taskImageBucket.bucketName
        })
    }

    private initializeBucketPolicies() {
        const authenticatedRole = Role.fromRoleArn(
            this, 'authenticatedRoleTask', config.authenticatedRoleArn)
        const adminRole = Role.fromRoleArn(
            this, 'adminRoleTask', config.adminRoleArn)
        const uploadBucketPolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                's3:PutObject',
                's3:PutObjectAcl',
                's3:GetObject',
                's3:DeleteObject'
            ],
            resources: [this.taskImageBucket.bucketArn + '/*']
        })
        authenticatedRole.addToPrincipalPolicy(uploadBucketPolicy)
        adminRole.addToPrincipalPolicy(uploadBucketPolicy)
    }

}
