import * as cdk from 'aws-cdk-lib';
import {
  aws_cloudfront,
  aws_cloudfront_origins,
  aws_iam,
  aws_s3,
  RemovalPolicy
} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {FunctionEventType, ViewerProtocolPolicy} from "aws-cdk-lib/aws-cloudfront";

export class IacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const originS3Bucket = new aws_s3.Bucket(this, 'MKDocsOriginS3Bucket', {
      bucketName: `${cdk.Stack.of(this).account}-mkdocs-origin`,
      websiteIndexDocument: 'index.html',
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const originAccessControl = new aws_cloudfront.CfnOriginAccessControl(this, 'MKDocsOriginAccessControl', {
      originAccessControlConfig: {
        name: 'MKDocsOriginAccessControlForOriginS3Bucket',
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
        description: 'Access Control',
      },
    });

    const distribution = new aws_cloudfront.Distribution(this, 'MKDocsDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new aws_cloudfront_origins.S3Origin(originS3Bucket),
        functionAssociations : [
          {
            eventType: FunctionEventType.VIEWER_REQUEST,
            function: new aws_cloudfront.Function(this, 'MKDocsBasicAuthFunction', {
              functionName: `mkdocs-basic-authentication`,
              code: aws_cloudfront.FunctionCode.fromFile({
                filePath: "basic_auth_function/index.js"
              }),
            }),
          },
        ],
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
    });

    const bucketPolicyStatement = new aws_iam.PolicyStatement({
      actions: ['s3:GetObject'],
      effect: aws_iam.Effect.ALLOW,
      principals: [
          new aws_iam.ServicePrincipal('cloudfront.amazonaws.com')
      ],
      resources: [`${originS3Bucket.bucketArn}/*`]
    });

    bucketPolicyStatement.addCondition('StringEquals', {
      'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${distribution.distributionId}`
    });

    originS3Bucket.addToResourcePolicy(bucketPolicyStatement)

    const cfnDistribution = distribution.node.defaultChild as aws_cloudfront.CfnDistribution
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', originAccessControl.getAtt('Id'))
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.DomainName', originS3Bucket.bucketRegionalDomainName)
    cfnDistribution.addOverride('Properties.DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity', "")
    cfnDistribution.addPropertyDeletionOverride('DistributionConfig.Origins.0.CustomOriginConfig')

  }
}
