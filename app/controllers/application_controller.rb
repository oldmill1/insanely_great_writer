class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Changes to the importmap will invalidate the etag for HTML responses
  stale_when_importmap_changes

  helper_method :authed?, :current_user

  private

  def current_user
    return @current_user if defined?(@current_user)

    user_id = session[:user_id]

    while user_id.is_a?(Hash)
      user_id = user_id["user_id"] || user_id[:user_id] || user_id["id"] || user_id[:id]
    end

    user_id = user_id.to_s if user_id.is_a?(Symbol) || user_id.is_a?(Integer)
    return @current_user = nil unless user_id.is_a?(String) && user_id.present?

    @current_user = User.find_by(id: user_id)
  end

  def authed?
    current_user.present?
  end
end
