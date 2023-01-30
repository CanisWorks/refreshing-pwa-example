import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Effect, PolicyStatement, Role, WebIdentityPrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface S3HostingStackProps extends StackProps {
  OIDCProviderArn: string;
}

export class S3HostingStack extends Stack {
  constructor(scope: Construct, id: string, props: S3HostingStackProps) {
    super(scope, id, props);

    const s3Bucket = new Bucket(this, 'WWWBucket', {
      bucketName: 'www-cw-example-pwa',
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      publicReadAccess: true,
      websiteErrorDocument: 'index.html',
      websiteIndexDocument: 'index.html',
    });

    new CfnOutput(this, 'bucketName', {
      value: s3Bucket.bucketName,
    });
    new CfnOutput(this, 'bucketDomain', {
      value: s3Bucket.bucketDomainName,
    });

    // IAM role for github actions IODC provider (used in the actions pipeline instead of user access keys).
    const deployRole = new Role(this, 'githubDeployRole', {
      roleName: 'pwa-example-github-deploy',
      description: 'PWA example application deployment to S3 role',
      assumedBy: new WebIdentityPrincipal(props.OIDCProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          'token.actions.githubusercontent.com:sub': [
            'repo:CanisWorks/refreshing-pwa-example:push',
            'repo:CanisWorks/refreshing-pwa-example:ref:refs/heads/main',
          ],
        },
      }),
    });

    // Addtional IAM policy to allow pushing from github actions to the s3 bucket.
    const pushToBucketPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:DeleteObject',
        's3:GetBucketLocation',
        's3:GetObject',
        's3:ListBucket',
        's3:PutObject',
        's3:PutObjectAcl',
      ],
      resources: [
        s3Bucket.bucketArn,
        `${s3Bucket.bucketArn}/*`,
      ],
    });
    deployRole.addToPolicy(pushToBucketPolicy);

    new CfnOutput(this, 'deployRoleArn', {
      value: deployRole.roleArn,
    });
  }
}