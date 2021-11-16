// Copyright © 2021 Kaleido, Inc.
//
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  Box,
  Button,
  CircularProgress,
  Grid,
  TablePagination,
  Typography,
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import dayjs from 'dayjs';
import CheckBoldIcon from 'mdi-react/CheckBoldIcon';
import CloseThickIcon from 'mdi-react/CloseThickIcon';
import TimerSandEmptyIcon from 'mdi-react/TimerSandEmptyIcon';
import React, { useContext, useEffect, useState } from 'react';
import { ArrayParam, useQueryParam, withDefault } from 'use-query-params';
import { DataTable } from '../../../../core/components/DataTable/DataTable';
import { FilterDisplay } from '../../../../core/components/FilterDisplay';
import { FilterModal } from '../../../../core/components/FilterModal';
import { HashPopover } from '../../../../core/components/HashPopover';
import { ApplicationContext } from '../../../../core/contexts/ApplicationContext';
import { NamespaceContext } from '../../../../core/contexts/NamespaceContext';
import {
  IDataTableRecord,
  IOperation,
  OperationStatus,
} from '../../../../core/interfaces';
import { fetchWithCredentials, filterOperators } from '../../../../core/utils';
import { useDataTranslation } from '../../registration';

const PAGE_LIMITS = [10, 25];

export const Operations: () => JSX.Element = () => {
  const { t } = useDataTranslation();
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [operationItems, setOperationItems] = useState<IOperation[]>([]);
  const { selectedNamespace } = useContext(NamespaceContext);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_LIMITS[0]);
  const { createdFilter, lastEvent } = useContext(ApplicationContext);
  const [filterAnchor, setFilterAnchor] = useState<HTMLButtonElement | null>(
    null
  );
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filterString, setFilterString] = useState('');
  const [filterQuery, setFilterQuery] = useQueryParam(
    'filters',
    withDefault(ArrayParam, [])
  );

  useEffect(() => {
    // set filters if they are present in the URL
    if (filterQuery.length !== 0) {
      setActiveFilters(filterQuery as string[]);
    }
  }, [setActiveFilters, filterQuery]);

  useEffect(() => {
    //set query param state
    setFilterQuery(activeFilters);
    if (activeFilters.length === 0) {
      setFilterString('');
      return;
    }

    setFilterString(`&${activeFilters.join('&')}`);
  }, [activeFilters, setFilterQuery]);

  const handleOpenFilter = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFilterAnchor(event.currentTarget);
  };

  const handleAddFilter = (filter: string) => {
    setActiveFilters((activeFilters) => [...activeFilters, filter]);
  };

  const filterFields = [
    'blob.hash',
    'blob.public',
    'created',
    'datatype.name',
    'datatype.version',
    'hash',
    'id',
    'key',
    'namespace',
    'validator',
  ];

  const columnHeaders = [
    t('id'),
    t('type'),
    t('plugin'),
    t('timestamp'),
    t('status'),
  ];

  const handleChangePage = (_event: unknown, newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCurrentPage(0);
    setRowsPerPage(+event.target.value);
  };

  const pagination = (
    <TablePagination
      component="div"
      count={-1}
      rowsPerPage={rowsPerPage}
      page={currentPage}
      onPageChange={handleChangePage}
      onRowsPerPageChange={handleChangeRowsPerPage}
      rowsPerPageOptions={PAGE_LIMITS}
      labelDisplayedRows={({ from, to }) => `${from} - ${to}`}
      className={classes.pagination}
    />
  );

  useEffect(() => {
    setLoading(true);
    let createdFilterString = `&created=>=${dayjs()
      .subtract(24, 'hours')
      .unix()}`;
    if (createdFilter === '30days') {
      createdFilterString = `&created=>=${dayjs().subtract(30, 'days').unix()}`;
    }
    if (createdFilter === '7days') {
      createdFilterString = `&created=>=${dayjs().subtract(7, 'days').unix()}`;
    }

    fetchWithCredentials(
      `/api/v1/namespaces/${selectedNamespace}/operations?limit=${rowsPerPage}&skip=${
        rowsPerPage * currentPage
      }${createdFilterString}${filterString !== undefined ? filterString : ''}`
    )
      .then(async (response) => {
        if (response.ok) {
          // Todo - remove
          const res: IOperation[] = await response.json();
          res[1].status = OperationStatus.Failed;
          res[3].status = OperationStatus.Pending;
          setOperationItems(res);
        } else {
          console.log('error fetching data');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    rowsPerPage,
    currentPage,
    selectedNamespace,
    createdFilter,
    lastEvent,
    filterString,
  ]);

  const records: IDataTableRecord[] = operationItems.map(
    (data: IOperation) => ({
      key: data.id,
      columns: [
        {
          value: <HashPopover textColor="secondary" address={data.id} />,
        },
        { value: data.type },
        {
          value: data.plugin,
        },
        { value: dayjs(data.created).format('MM/DD/YYYY h:mm A') },
        {
          value: (
            <Button
              variant="contained"
              color={
                OperationStatus.Succeeded === data.status
                  ? 'success'
                  : OperationStatus.Pending === data.status
                  ? 'warning'
                  : 'error'
              }
            >
              {OperationStatus.Succeeded === data.status ? (
                <CheckBoldIcon></CheckBoldIcon>
              ) : OperationStatus.Pending === data.status ? (
                <TimerSandEmptyIcon></TimerSandEmptyIcon>
              ) : (
                <CloseThickIcon></CloseThickIcon>
              )}
            </Button>
          ),
        },
      ],
    })
  );

  if (loading) {
    return (
      <Box className={classes.centeredContent}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Grid container justifyContent="center">
        <Grid container wrap="nowrap" direction="column">
          <Grid container spacing={2} item direction="row">
            <Grid item>
              <Typography className={classes.header} variant="h4">
                {t('operations')}
              </Typography>
            </Grid>
            <Box className={classes.separator} />
            <Grid item>
              <Button
                className={classes.filterButton}
                variant="outlined"
                onClick={handleOpenFilter}
              >
                <Typography>{t('filter')}</Typography>
              </Button>
            </Grid>
          </Grid>
          {activeFilters.length > 0 && (
            <Grid container className={classes.filterContainer}>
              <FilterDisplay
                filters={activeFilters}
                setFilters={setActiveFilters}
              />
            </Grid>
          )}
          <Grid container item>
            <DataTable
              minHeight="300px"
              maxHeight="calc(100vh - 340px)"
              {...{ columnHeaders }}
              {...{ records }}
              {...{ pagination }}
            />
          </Grid>
        </Grid>
      </Grid>
      {filterAnchor && (
        <FilterModal
          anchor={filterAnchor}
          onClose={() => {
            setFilterAnchor(null);
          }}
          fields={filterFields}
          operators={filterOperators}
          addFilter={handleAddFilter}
        />
      )}
    </>
  );
};

const useStyles = makeStyles((theme) => ({
  header: {
    fontWeight: 'bold',
  },
  pagination: {
    color: theme.palette.text.secondary,
  },
  centeredContent: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: 'calc(100vh - 300px)',
    overflow: 'auto',
  },
  separator: {
    flexGrow: 1,
  },
  filterContainer: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  filterButton: {
    height: 40,
  },
}));
