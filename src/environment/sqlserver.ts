import * as azure from '@pulumi/azure';
import * as pulumi from '@pulumi/pulumi';
import { ISqlArgs } from '../interfaces/args';
import { ISqlServerConfig } from '../interfaces/config';

const logger = pulumi.log;
const config: ISqlServerConfig = new pulumi.Config('environment').requireObject('sqlServer');
const { hasFailover } = config;

export class SqlServer extends pulumi.ComponentResource {
  /**
   * Creates virtual network
   * @param name The _unique_ name of the resource.
   * @param sqlArgs The arguments to configure the sqlServer.
   * @param opts A bag of options that control this resource's behavior.
   */

  constructor(name: string, sqlArgs: ISqlArgs, opts?: pulumi.ResourceOptions) {
    const inputs: pulumi.Inputs = {
      options: opts,
    };

    super('infrastructure:SqlServer', name, inputs, opts);
    const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

    // Set defaults that will be used by primary and secondary instances
    const administratorLogin = 'randomlogin';
    const administratorLoginPassword = 'ran9ma09msdn8a!';
    const version = '12.0';

    const primarySqlServerName = `${sqlArgs.prefix}we-sql`;
    const primarySqlServer = new azure.sql.SqlServer(primarySqlServerName, {
      name: primarySqlServerName,
      resourceGroupName: sqlArgs.resourceGroupName,
      administratorLogin,
      administratorLoginPassword,
      version,
    }, defaultResourceOptions);

    sqlArgs.virtualNetworkFirewallRules.forEach((x, i) => {
      const ruleName = `${primarySqlServerName}-${i}`;
      const firewallRule = new azure.sql.VirtualNetworkRule(ruleName, {
        name: ruleName,
        resourceGroupName: sqlArgs.resourceGroupName,
        serverName: primarySqlServerName,
        subnetId: x,
      }, { parent: primarySqlServer });
    });

    if (hasFailover) {
      const secondarySqlServerName = `${sqlArgs.prefix}ne-sql`;
      const secondarySqlServer = new azure.sql.SqlServer(secondarySqlServerName, {
        name: primarySqlServerName,
        resourceGroupName: sqlArgs.resourceGroupName,
        location: 'NorthEurope',
        administratorLogin,
        administratorLoginPassword,
        version,
      }, defaultResourceOptions);

      const failoverGroupName = `${sqlArgs.prefix}-sql`;
      const failoverGroup = new azure.sql.FailoverGroup(failoverGroupName, {
        name: failoverGroupName,
        resourceGroupName: sqlArgs.resourceGroupName,
        serverName: primarySqlServer.name,
        partnerServers: [
          {
            id: secondarySqlServer.id,
          },
        ],
        readWriteEndpointFailoverPolicy: {
          mode: 'Manual',
        },
      }, { parent: primarySqlServer });
    }
  }
}
