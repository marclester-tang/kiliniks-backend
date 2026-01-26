import * as cdk from 'aws-cdk-lib';

export interface KiliniksStackProps extends cdk.StackProps {
  stage: 'staging' | 'prod';
  clinicName: string;
}
