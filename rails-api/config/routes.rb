Rails.application.routes.draw do
  # Legacy health check path for backward compat with Stage 1 docker health checks
  get "/health", to: "api/v1/health#show"

  namespace :api do
    namespace :v1 do
      get "health", to: "health#show"

      resources :invites, param: :token, only: [:create] do
        member do
          get  "/",       action: :show,    as: :show
          post "consume", action: :consume, as: :consume
        end
      end
    end
  end
end
