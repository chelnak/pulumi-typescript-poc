import * as azure from '@pulumi/azure';
import * as pulumi from '@pulumi/pulumi';
import { ISqlArgs } from '../interfaces/args';
import { IEnvironmentConfig } from '../interfaces/config';

const logger = pulumi.log;

// Get configuration
const layers = new pulumi.Config('layers');
const environment = layers.requireObject<IEnvironmentConfig>('environment');

// Set defaults that will be used by primary and secondary instances
const administratorLogin = 'randomlogin';
const administratorLoginPassword = 'ran9ma09msdn8a!';
const version = '12.0';

export class SqlServer extends pulumi.ComponentResource {
  /**
   * Creates a SQL Server instance
   * @param name The _unique_ name of the resource.
   * @param sqlArgs The ISqlArgs used to configure the sqlServer and it's components.
   * @param opts A bag of options that control this resource's behavior.
   */

  constructor(name: string, sqlArgs: ISqlArgs, opts?: pulumi.ResourceOptions) {
    const inputs: pulumi.Inputs = {
      options: opts,
    };

    super('infrastructure:SqlServer', name, inputs, opts);
    const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

    const primarySqlServerName = `${sqlArgs.prefix}-sql-we`;
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

    if (environment.sqlServer.hasFailover) {
      const secondarySqlServerName = `${sqlArgs.prefix}-sql-ne`;
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

      sqlArgs.virtualNetworkFirewallRules.forEach((x, i) => {
        const ruleName = `${secondarySqlServerName}-${i}`;
        const firewallRule = new azure.sql.VirtualNetworkRule(ruleName, {
          name: ruleName,
          resourceGroupName: sqlArgs.resourceGroupName,
          serverName: secondarySqlServerName,
          subnetId: x,
        }, { parent: secondarySqlServer });
      });
    }
  }
}
