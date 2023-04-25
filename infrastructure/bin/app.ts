#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TaskApiStack } from '../stack/task-api-stack';
import {TaskStatefulStack} from "../stack/task-stateful-stack";

const app = new cdk.App();

const taskStatefulStack = new TaskStatefulStack(
    app, 'TaskStatefulStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    }})
new TaskApiStack(app, 'TaskApiStack', {
    taskApiStatefulStack: taskStatefulStack,
}, {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    }
});
