import * as pulumi from '@pulumi/pulumi';
import * as management from './management';

const environment = pulumi.getStack();
const config = new pulumi.Config('metadata');
const program = config.get('program');
const service = config.get('service');
const logger = pulumi.log;

logger.info('Creating management resources');
const prefix = `${program}-${environment}-${service}`;
const m = new management.ManagementLayer('management-resources', { prefix });
