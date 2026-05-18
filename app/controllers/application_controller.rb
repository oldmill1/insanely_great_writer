class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Changes to the importmap will invalidate the etag for HTML responses
  stale_when_importmap_changes

  helper_method :authed?
  before_action :redirect_to_canonical_host
  before_action :configure_permitted_parameters, if: :devise_controller?

  private

  def redirect_to_canonical_host
    return unless Rails.env.production?
    return unless request.get? || request.head?
    return unless request.host == "manuscriptos.com"
    return if request.path == rails_health_check_path

    redirect_to url_for(host: "www.manuscriptos.com", protocol: "https://"), status: :moved_permanently
  end

  def authed?
    user_signed_in?
  end

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [ :author_name ])
    devise_parameter_sanitizer.permit(:account_update, keys: [ :author_name, :timezone ])
  end
end
