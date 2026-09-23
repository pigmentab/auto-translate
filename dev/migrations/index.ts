import * as migration_20260608_112151 from './20260608_112151';
import * as migration_20260610_125120_add_nested_docs_to_pages from './20260610_125120_add_nested_docs_to_pages';
import * as migration_20260923_131143_add_reset_password_requested_at from './20260923_131143_add_reset_password_requested_at';

export const migrations = [
  {
    up: migration_20260608_112151.up,
    down: migration_20260608_112151.down,
    name: '20260608_112151',
  },
  {
    up: migration_20260610_125120_add_nested_docs_to_pages.up,
    down: migration_20260610_125120_add_nested_docs_to_pages.down,
    name: '20260610_125120_add_nested_docs_to_pages',
  },
  {
    up: migration_20260923_131143_add_reset_password_requested_at.up,
    down: migration_20260923_131143_add_reset_password_requested_at.down,
    name: '20260923_131143_add_reset_password_requested_at'
  },
];
