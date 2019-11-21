export interface IGlobalConfig {
  program: string;
}

export interface IManagementConfig {
  service: string;
  name: string;
}

interface IAppServicePlanConfig {
  name: string;
  size: string;
}

interface ISqlServerConfig {
  hasFailover: boolean;
}

export interface IEnvironmentConfig {
  service: string;
  names: string[];
  appServicePlan: IAppServicePlanConfig[];
  sqlServer: ISqlServerConfig;
}
