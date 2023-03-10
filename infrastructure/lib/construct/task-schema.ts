import {JsonSchemaType} from "aws-cdk-lib/aws-apigateway";

export const postTaskSchema = {
    type: JsonSchemaType.OBJECT,
    required: [
        "type", "uri",
        // "name", "photos", "categories",
        // "location", "topics"
    ],
    properties: {
        type: {
            type: JsonSchemaType.STRING
        },
        uri: {
            type: JsonSchemaType.STRING
        },
    },
}

export const putTaskSchema = {
    type: JsonSchemaType.OBJECT,
    required: [
        "type", "uri",
        // "name", "photos", "categories",
        // "location", "topics"
    ],
    properties: {
        type: {
            type: JsonSchemaType.STRING
        },
        uri: {
            type: JsonSchemaType.STRING
        },
    },
}
