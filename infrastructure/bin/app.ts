#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TaskStack } from '../stack/task-stack';
import {TaskStatefulStack} from "../stack/task-stateful-stack";
import config from "../config/config";

const app = new cdk.App();

const taskStatefulStack = new TaskStatefulStack(
    // app, `TaskStatefulStack-${config.envName}`, {
    app, `TaskStatefulStack`, {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    }})
// new TaskStack(app, `TaskApiStack-${config.envName}`, {
new TaskStack(app, `TaskApiStack`, {
    taskApiStatefulStack: taskStatefulStack,
}, {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    }
});
