import { useMutation } from '@tanstack/react-query';
import type {
  CarePlanRequest,
  CarePlanResponse,
  IdentifyPlantRequest,
  IdentifyPlantResponse,
  PlantDescriptionRequest,
  PlantDescriptionResponse,
  RefineCarePlanRequest,
  RefineCarePlanResponse,
} from '@garden-guide/shared';
import * as api from '../../lib/api';

export function useIdentifyPlant() {
  return useMutation<IdentifyPlantResponse, Error, IdentifyPlantRequest>({
    mutationFn: api.aiIdentifyPlant,
  });
}

export function useGenerateCarePlan() {
  return useMutation<CarePlanResponse, Error, CarePlanRequest>({
    mutationFn: api.aiCarePlan,
  });
}

export function useRefineCarePlan() {
  return useMutation<RefineCarePlanResponse, Error, RefineCarePlanRequest>({
    mutationFn: api.aiRefineCarePlan,
  });
}

export function usePlantDescription() {
  return useMutation<PlantDescriptionResponse, Error, PlantDescriptionRequest>({
    mutationFn: api.aiPlantDescription,
  });
}

