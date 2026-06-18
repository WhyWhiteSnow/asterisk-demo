/** Номера тестовых абонентов при create_test_users (совпадает с backend seed). */
export const DEFAULT_TEST_EXTENSIONS = ['101', '102'] as const

export const formatTestExtensionsLabel = (): string => DEFAULT_TEST_EXTENSIONS.join(', ')

export const getDefaultFirstExtension = (): string => DEFAULT_TEST_EXTENSIONS[0]
