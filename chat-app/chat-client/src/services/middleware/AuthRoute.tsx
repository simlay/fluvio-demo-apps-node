import * as React from 'react';
import { Redirect, Route, RouteComponentProps } from 'react-router-dom';
import { getLocalStorage } from '../middleware/LocalStorage';

interface Props {
    Component: any,
    path: string,
    exact?: boolean,
};

const AuthRoute = ({ Component, path, exact = false }: Props) => {
    const isAuthenticated = getLocalStorage();

    return (
        <Route
            exact={exact}
            path={path}
            render={(props: RouteComponentProps) =>
                isAuthenticated ? (
                    <Component {...props} />
                ) : (
                        <Redirect
                            to={{
                                pathname: '/login',
                                state: {
                                    requestedPath: path,
                                }
                            }}
                        />
                    )
            }
        />
    );
};

export default AuthRoute;