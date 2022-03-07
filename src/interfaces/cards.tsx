export interface IDataWithHeader {
  header?: string;
  data: string | number | undefined;
}

export interface ISmallCard {
  header: string;
  numErrors: number;
  data: IDataWithHeader[];
  clickPath?: string;
}

export interface IMediumCard {
  headerComponent?: JSX.Element | string;
  headerText: string;
  component: JSX.Element;
}

export interface ITableCard {
  headerComponent: any;
  headerText: string;
  component: any;
}

export interface ITableCardItem {
  header: string;
  status: string;
  subText: string;
  date: string;
}
