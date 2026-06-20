export interface FeatureCodesSettings {
  vm_access: string
  vm_check: string
  cf_activate: string
  cf_deactivate: string
  dnd_activate: string
  dnd_deactivate: string
  vm_access_enabled: boolean
  vm_check_enabled: boolean
  cf_codes_enabled: boolean
  dnd_codes_enabled: boolean
}

export type FeatureCodesUpdate = Partial<FeatureCodesSettings>
