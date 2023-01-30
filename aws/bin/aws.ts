#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { S3HostingStack, S3HostingStackProps } from '../lib/s3-hosting-stack';

const app = new cdk.App();

const OIDCProviderArn = app.node.tryGetContext('oidc_provider_arn') || '';

const stackProps: S3HostingStackProps = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
  OIDCProviderArn,
};

new S3HostingStack(app, 'S3HostingStack', stackProps);