import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Stack} from "aws-cdk-lib";
import {TaskApis} from "../lib/construct/task-apis";
import {TaskStatefulStack} from "./task-stateful-stack";
import {TaskAyncFunctions} from "../lib/construct/task-aync-functions";

export interface TaskStackProps {
  taskApiStatefulStack: TaskStatefulStack
}

export class TaskStack extends Stack {

  public taskApis:TaskApis
  public taskFunctions: TaskAyncFunctions

  constructor(scope: Construct, id: string, taskApiProps: TaskStackProps,
              props?: cdk.StackProps) {
    super(scope, id, props);
    this.taskApis = new TaskApis(this,id, {
      taskTable: taskApiProps.taskApiStatefulStack.taskTable,
      transactionTable: taskApiProps.taskApiStatefulStack.transactionTable,
      taskImageBucket: taskApiProps.taskApiStatefulStack.taskImageBucket
    })

    this.taskFunctions = new TaskAyncFunctions(this, 'profileAsyncFunctionsId', {
      taskTable: taskApiProps.taskApiStatefulStack.taskTable,
      transactionTable: taskApiProps.taskApiStatefulStack.transactionTable
    })
  }

}
