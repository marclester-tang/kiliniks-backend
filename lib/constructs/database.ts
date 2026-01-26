import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { KiliniksStackProps } from '../common-types';

interface DatabaseProps {
  vpc: ec2.IVpc;
  stage: KiliniksStackProps['stage'];
  clinicName: string;
}

export class Database extends Construct {
  public readonly cluster: rds.DatabaseCluster;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    this.securityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
        vpc: props.vpc,
        description: 'Allow connection to RDS',
        allowAllOutbound: true 
    });

    this.cluster = new rds.DatabaseCluster(this, 'KiliniksDB', {
      clusterIdentifier: `kiliniks-db-${props.clinicName}-${props.stage}`,
      engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_14_6 }),
      writer: rds.ClusterInstance.serverlessV2('Writer'),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: props.stage === 'prod' ? 4 : 1,
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [this.securityGroup],
      defaultDatabaseName: 'kiliniks',
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });
  }
}
