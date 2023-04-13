import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Stack} from "aws-cdk-lib";
import {TaskApis} from "../lib/construct/task-apis";
import {TaskStatefulStack} from "./task-stateful-stack";

export interface ReviewableApiStackProps {
  taskApiStatefulStack: TaskStatefulStack
}

export class TaskApiStack extends Stack {

  public taskApis:TaskApis

  constructor(scope: Construct, id: string, reviewableApiProps: ReviewableApiStackProps,
              props?: cdk.StackProps) {
    super(scope, id, props);
    this.taskApis = new TaskApis(this,id, {
      taskTable: reviewableApiProps.taskApiStatefulStack.taskTable,
      transactionTable: reviewableApiProps.taskApiStatefulStack.transactionTable,
      taskImageBucket: reviewableApiProps.taskApiStatefulStack.taskImageBucket
    })
  }


}
