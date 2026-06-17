export type VatsUiStatus = 'Активна' | 'Отключена' | 'Ошибка' | 'Создаётся'

export type VatsEditableStatus = 'Активна' | 'Отключена'

export function mapApiStatusToUi(apiStatus: string): VatsUiStatus {
  switch (apiStatus) {
    case 'running':
      return 'Активна'
    case 'creating':
      return 'Создаётся'
    case 'error':
      return 'Ошибка'
    default:
      return 'Отключена'
  }
}

export function mapUiStatusToApi(uiStatus: VatsEditableStatus): 'running' | 'stopped' {
  return uiStatus === 'Активна' ? 'running' : 'stopped'
}

export function isEditableApiStatus(apiStatus: string): boolean {
  return apiStatus === 'running' || apiStatus === 'stopped'
}
