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
import { MenuItem, TextField } from '@mui/material';
import React, { useContext } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { RouterParams } from '../../navigation/NavigationInterfaces';
import { NamespaceContext } from '../contexts/NamespaceContext';

export const NamespacePicker: React.FC = () => {
  const { namespace: routerNamespace } = useParams<RouterParams.NAMESPACE>();
  const { selectedNamespace, setSelectedNamespace, namespaces } =
    useContext(NamespaceContext);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleNamespaceSelect = (namespace: string) => {
    setSelectedNamespace(namespace);
    navigate(
      pathname
        .replace(`/namespace/${routerNamespace}`, `/namespace/${namespace}`)
        .split('/')
        .slice(0, 4) // redirect to the moduleRoutePrefix for the module (/namespace/:namespace/MODULE)
        .join('/')
    );
  };

  return (
    <TextField
      select
      size="small"
      variant="outlined"
      value={selectedNamespace}
      onChange={(event) => handleNamespaceSelect(event.target.value)}
    >
      {namespaces.map((namespace, index) => (
        <MenuItem key={index} value={namespace.name}>
          {namespace.name}
        </MenuItem>
      ))}
    </TextField>
  );
};
