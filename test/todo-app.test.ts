// import * as cdk from 'aws-cdk-stack';
// import { Template } from 'aws-cdk-stack/assertions';
// import * as TodoApp from '../stack/todo-app-stack';

// example test. To run these tests, uncomment this file along with the
// example resource in stack/category-api-stack.ts
// test('SQS Queue Created', () => {
//   const app = new cdk.App();
//     // WHEN
//   const stack = new TodoApp.CategoryApiStack(app, 'MyTestStack');
//     // THEN
//   const template = Template.fromStack(stack);

//   template.hasResourceProperties('AWS::SQS::Queue', {
//     VisibilityTimeout: 300
//   });
// });
// import jwt_decode from "jwt-decode"
// let token = "eyJraWQiOiJCalptUVlxRjdiSWdcLzljU3FNZzlTQTYrTEJLOHlRTzVGeDVvY21vVUFFcz0iLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoibG1UY3k2SFBuZk5XWGNUQzNZR1ZFQSIsInN1YiI6ImVmZWUzNTZhLWZkZjgtNDBkNC1hOWE0LTk5YTJiYTE3Yjg2YSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV90WGdOMnVlR2QiLCJjb2duaXRvOnVzZXJuYW1lIjoiZWZlZTM1NmEtZmRmOC00MGQ0LWE5YTQtOTlhMmJhMTdiODZhIiwib3JpZ2luX2p0aSI6IjBhODcxYTM3LTcyNmUtNGVmNC1iNjM2LWYwZjZlMWZkN2Y2ZCIsImF1ZCI6IjdyODV2bG5mOTIwdGNiYzJ1NjhtNnQwNjB2IiwiZXZlbnRfaWQiOiJmYTFjMGQ1YS0zM2RkLTRiNTYtYTEwZC0yYzgzNTM2NzVhYjYiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTY3MjgwMjI4MCwiZXhwIjoxNjcyODA1ODgwLCJpYXQiOjE2NzI4MDIyODAsImp0aSI6IjQzZjUwNWUxLTk2NjQtNDcxMS04N2IxLWZjNTE1ZDY0MGViMyIsImVtYWlsIjoiYi5oYWppYW5AZ21haWwuY29tIn0.ORcEkkpIcMPt-BpoE56S9DkZNXTf4q3O1FBbNkE6hAT2gjnmGHGrlLRUbCzGu01gmcOo-tvI9RzxKRWF5EZeo1g02M0rhdcvu6904gw2gVcChTQx_nqWIK1Cs0G5Hc3pO3FKDd9Z3ODK0eIR7tmQCoCAsoAYNLOuuy0-pzLD0KU4ifBWYR-9ZFsGoNfOffv88Ksx7bB4IEOFlUMxdBUCTpvqLuMc1j_JXjUpsWDK7jX1KxBIynk-9uBkmjn5yHt_Mies6bv62PtVgt312ogBEl20inByiorQlxCOE-QN9Ul_7c79s5m6g_mX1g2WsPNL0PxHvd0iYgp4HLRIaxlcLA"
// let decoded: any = jwt_decode(token);
// console.log(decoded.sub)
