// Copyright © 2022 Kaleido, Inc.
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

import { Grid } from '@mui/material';
import { Box } from '@mui/system';
import { BarDatum } from '@nivo/bar';
import dayjs from 'dayjs';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InfiniteData, useInfiniteQuery, useQueryClient } from 'react-query';
import { EventCardWrapper } from '../../../components/Cards/EventCards/EventCardWrapper';
import { Histogram } from '../../../components/Charts/Histogram';
import { FilterButton } from '../../../components/Filters/FilterButton';
import { FilterModal } from '../../../components/Filters/FilterModal';
import { Header } from '../../../components/Header';
import { ChartTableHeader } from '../../../components/Headers/ChartTableHeader';
import { FFTimelineHeader } from '../../../components/Headers/TimelineHeader';
import { EventSlide } from '../../../components/Slides/EventSlide';
import { TransactionSlide } from '../../../components/Slides/TransactionSlide';
import { FFTimeline } from '../../../components/Timeline/FFTimeline';
import { ApplicationContext } from '../../../contexts/ApplicationContext';
import { DateFilterContext } from '../../../contexts/DateFilterContext';
import { FilterContext } from '../../../contexts/FilterContext';
import { SlideContext } from '../../../contexts/SlideContext';
import { SnackbarContext } from '../../../contexts/SnackbarContext';
import {
  BucketCollectionEnum,
  BucketCountEnum,
  EventCategoryEnum,
  EventFilters,
  FF_NAV_PATHS,
  FF_Paths,
  IEvent,
  IPagedEventResponse,
  ITransaction,
} from '../../../interfaces';
import { DEFAULT_HIST_HEIGHT, DEFAULT_PADDING, FFColors } from '../../../theme';
import {
  fetchCatcher,
  fetchWithCredentials,
  makeEventHistogram,
} from '../../../utils';
import { isHistogramEmpty } from '../../../utils/charts';
import { isOppositeTimelineEvent } from '../../../utils/timeline';
import { isEventType, WsEventTypes } from '../../../utils/wsEvents';

const ROWS_PER_PAGE = 25;

export const ActivityTimeline: () => JSX.Element = () => {
  const { lastEvent, selectedNamespace } = useContext(ApplicationContext);
  const { dateFilter } = useContext(DateFilterContext);
  const { filterAnchor, setFilterAnchor, filterString } =
    useContext(FilterContext);
  const { slideQuery, addSlideToParams } = useContext(SlideContext);
  const { reportFetchError } = useContext(SnackbarContext);
  const [isMounted, setIsMounted] = useState(false);
  const [eventHistData, setEventHistData] = useState<BarDatum[]>();
  const { t } = useTranslation();
  const [viewTx, setViewTx] = useState<ITransaction>();
  const [viewEvent, setViewEvent] = useState<IEvent>();
  const queryClient = useQueryClient();
  const [isVisible, setIsVisible] = useState(0);
  // Last event tracking
  const [numNewEvents, setNumNewEvents] = useState(0);
  const [lastRefreshTime, setLastRefresh] = useState<string>(
    new Date().toISOString()
  );

  useEffect(() => {
    isMounted &&
      isEventType(lastEvent, WsEventTypes.EVENT) &&
      setNumNewEvents(numNewEvents + 1);
  }, [lastEvent]);

  const refreshData = () => {
    setNumNewEvents(0);
    setLastRefresh(new Date().toString());
  };

  useEffect(() => {
    setIsMounted(true);
    setNumNewEvents(0);
    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (isMounted && slideQuery) {
      fetchCatcher(
        `${FF_Paths.nsPrefix}/${selectedNamespace}${FF_Paths.events}?id=${slideQuery}`
      ).then((eventRes: IEvent[]) => {
        isMounted && eventRes.length > 0 && setViewEvent(eventRes[0]);
      });
      fetchCatcher(
        `${FF_Paths.nsPrefix}/${selectedNamespace}${FF_Paths.transactions}?id=${slideQuery}`
      ).then((txRes: ITransaction[]) => {
        isMounted && txRes.length > 0 && setViewTx(txRes[0]);
      });
    }
  }, [slideQuery, isMounted]);

  const { data, fetchNextPage, hasNextPage, refetch } = useInfiniteQuery(
    'events',
    async ({ pageParam = 0 }) => {
      const res = await fetchWithCredentials(
        `${FF_Paths.nsPrefix}/${selectedNamespace}${
          FF_Paths.events
        }?count&limit=${ROWS_PER_PAGE}&skip=${ROWS_PER_PAGE * pageParam}${
          dateFilter.filterString
        }${filterString ?? ''}&fetchreferences`
      );
      if (res.ok) {
        const data = await res.json();
        return {
          pageParam,
          ...data,
        };
      } else {
        reportFetchError(res.statusText);
      }
    },
    {
      getNextPageParam: (lastPage: IPagedEventResponse) => {
        return lastPage.count === ROWS_PER_PAGE
          ? lastPage.pageParam + 1
          : undefined;
      },
    }
  );

  // Events Histogram
  useEffect(() => {
    const currentTime = dayjs().unix();

    isMounted &&
      fetchCatcher(
        `${FF_Paths.nsPrefix}/${selectedNamespace}${FF_Paths.chartsHistogram(
          BucketCollectionEnum.Events,
          dateFilter.filterTime,
          currentTime,
          BucketCountEnum.Large
        )}`
      )
        .then((histEvents) => {
          isMounted && setEventHistData(makeEventHistogram(histEvents));
        })
        .catch((err) => {
          reportFetchError(err);
        });
  }, [selectedNamespace, dateFilter, lastRefreshTime, isMounted]);

  useEffect(() => {
    if (isVisible && hasNextPage && isMounted) {
      fetchNextPage();
    }
  }, [isVisible, hasNextPage, fetchNextPage, isMounted]);

  useEffect(() => {
    isMounted && refetch();
  }, [dateFilter, queryClient, refetch, filterString, isMounted]);

  useEffect(() => {
    if (isMounted) {
      refetch({ refetchPage: (_page, index) => index === 0 });
    }
  }, [refetch, lastRefreshTime, isMounted]);

  const buildTimelineElements = (
    data: InfiniteData<IPagedEventResponse> | undefined
  ) => {
    if (isMounted && data) {
      const pages = data.pages.map((page) => page.items);
      return pages.flat().map((event: IEvent, idx) => ({
        key: idx,
        item: (
          <EventCardWrapper
            onHandleViewEvent={(event: IEvent) => {
              setViewEvent(event);
              addSlideToParams(event.id);
            }}
            onHandleViewTx={(tx: ITransaction) => {
              setViewTx(tx);
              addSlideToParams(tx.id);
            }}
            link={FF_NAV_PATHS.activityTxDetailPath(
              selectedNamespace,
              event.tx
            )}
            {...{ event }}
            linkState={{ state: event }}
          />
        ),
        opposite: isOppositeTimelineEvent(event.type),
        timestamp: event.created,
      }));
    } else {
      return undefined;
    }
  };

  return (
    <>
      <Header title={t('timeline')} subtitle={t('activity')} />
      <Grid container px={DEFAULT_PADDING} direction="column" spacing={2}>
        <Grid item>
          <ChartTableHeader
            title={t('allEvents')}
            filter={
              <FilterButton
                onSetFilterAnchor={(e: React.MouseEvent<HTMLButtonElement>) =>
                  setFilterAnchor(e.currentTarget)
                }
              />
            }
          />
          <Box height={DEFAULT_HIST_HEIGHT}>
            <Histogram
              colors={[FFColors.Yellow, FFColors.Orange, FFColors.Pink]}
              data={eventHistData}
              indexBy="timestamp"
              keys={[
                EventCategoryEnum.BLOCKCHAIN,
                EventCategoryEnum.MESSAGES,
                EventCategoryEnum.TOKENS,
              ]}
              includeLegend={true}
              isEmpty={isHistogramEmpty(eventHistData ?? [])}
              emptyText={t('noActivity')}
            />
          </Box>
        </Grid>
        <Grid container justifyContent={'center'} direction="column" item>
          <FFTimelineHeader
            leftHeader={t('submittedByMe')}
            rightHeader={t('receivedFromEveryone')}
          />
          <FFTimeline
            elements={buildTimelineElements(data)}
            emptyText={t('noTimelineEvents')}
            height={'calc(100vh - 475px)'}
            fetchMoreData={() => setIsVisible(isVisible + 1)}
            hasMoreData={hasNextPage}
            numNewEvents={numNewEvents}
            fetchNewData={() => refreshData()}
          />
        </Grid>
      </Grid>
      {filterAnchor && (
        <FilterModal
          anchor={filterAnchor}
          onClose={() => {
            setFilterAnchor(null);
          }}
          fields={EventFilters}
        />
      )}
      {viewEvent && (
        <EventSlide
          event={viewEvent}
          open={!!viewEvent}
          onClose={() => {
            setViewEvent(undefined);
            addSlideToParams(undefined);
          }}
        />
      )}
      {viewTx && (
        <TransactionSlide
          transaction={viewTx}
          open={!!viewTx}
          onClose={() => {
            setViewTx(undefined);
            addSlideToParams(undefined);
          }}
        />
      )}
    </>
  );
};
