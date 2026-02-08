Rails.application.routes.draw do
  devise_for :users,
    path: "",
    skip: [ :sessions, :registrations ]

  devise_scope :user do
    get "login", to: "users/sessions#new", as: :new_user_session
    post "login", to: "users/sessions#create", as: :user_session
    delete "logout", to: "users/sessions#destroy", as: :destroy_user_session

    get "register", to: "users/registrations#new", as: :new_user_registration
    post "register", to: "users/registrations#create", as: :user_registration
    get "register/cancel", to: "users/registrations#cancel", as: :cancel_user_registration
  end
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  root "home#index"
  get "sandbox" => "home#sandbox"
  get "docs/:id" => "documents#show", as: :doc
  patch "notes/:id/position" => "notes#update_position"
  patch "shortcuts/:id/position" => "shortcuts#update_position"
end
