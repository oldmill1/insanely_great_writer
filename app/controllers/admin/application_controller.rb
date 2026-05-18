# All Administrate controllers inherit from this
# `Administrate::ApplicationController`, making it the ideal place to put
# authentication logic or other before_actions.
#
# If you want to add pagination or other controller-level concerns,
# you're free to overwrite the RESTful controller actions.
module Admin
  class ApplicationController < Administrate::ApplicationController
    before_action :authenticate_user!
    before_action :authorize_admin!

    private

    def authorize_admin!
      return if Rails.env.development? && admin_emails.blank?
      return if admin_emails.include?(current_user.email.downcase)

      redirect_to root_path, alert: "You are not authorized to access admin."
    end

    def admin_emails
      ENV.fetch("ADMIN_EMAILS", "")
        .split(",")
        .map { |email| email.strip.downcase }
        .compact_blank
    end

    # Override this value to specify the number of elements to display at a time
    # on index pages. Defaults to 20.
    # def records_per_page
    #   params[:per_page] || 20
    # end
  end
end
