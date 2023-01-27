import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { CloudFrontWebDistribution, OriginAccessIdentity, PriceClass } from 'aws-cdk-lib/aws-cloudfront';
import { Effect, PolicyStatement, Role, WebIdentityPrincipal } from 'aws-cdk-lib/aws-iam';
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3';
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
      removalPolicy: RemovalPolicy.DESTROY,
      accessControl: BucketAccessControl.PRIVATE,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    new CfnOutput(this, 'bucketName', {
      value: s3Bucket.bucketName,
    });
    new CfnOutput(this, 'bucketDomain', {
      value: s3Bucket.bucketDomainName,
    });

    // cloudfront cdn required for a https domain.
    const cfOAI = new OriginAccessIdentity(this, 'cfOAI', {
      comment: 'CF access to S3 bucket origin',
    });

    const cfDistribution = new CloudFrontWebDistribution(this, 'cfDistribution', {
      originConfigs: [{
        s3OriginSource: {
          s3BucketSource: s3Bucket,
          originAccessIdentity: cfOAI,
        },
        behaviors : [ { isDefaultBehavior: true,  }],
      }],
      errorConfigurations: [
        {
          errorCode: 404,
          responseCode: 200,
          responsePagePath: '/index.html',
          errorCachingMinTtl: 10,
        },
      ],
      priceClass: PriceClass.PRICE_CLASS_100,
      comment: 'example pwa app',
    });

    new CfnOutput(this, 'cfDomainName', { value: cfDistribution.distributionDomainName });

    // CF access policy to S3
    const bucketPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:ListBucket',
        's3:GetBucketLocation',
      ],
      resources: [
        s3Bucket.bucketArn,
        `${s3Bucket.bucketArn}/*`,
      ],
    });
    bucketPolicy.addCanonicalUserPrincipal(
      cfOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
    );
    s3Bucket.addToResourcePolicy(bucketPolicy);

    // IAM role for github actions IODC provider (used in the actions pipeline instead of user access keys).
    const deployRole = new Role(this, 'githubDeployRole', {
      roleName: 'pwa-example-github-deploy',
      description: 'PWA example application deployment to S3 role',
      assumedBy: new WebIdentityPrincipal(props.OIDCProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': 'repo:CanisWorks/refreshing-pwa-example:*',
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
    const cfInvalidationPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cloudfront:CreateInvalidation',
        'cloudfront:GetInvalidation',
        'cloudfront:ListInvalidations',
      ],
      resources: ['*'],
    });
    deployRole.addToPolicy(pushToBucketPolicy);
    deployRole.addToPolicy(cfInvalidationPolicy);

    new CfnOutput(this, 'deployRoleArn', {
      value: deployRole.roleArn,
    });
  }
}