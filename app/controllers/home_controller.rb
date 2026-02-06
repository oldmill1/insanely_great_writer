class HomeController < ApplicationController
  def index
  end

  def sandbox
    @sandbox_component = params[:id].to_s
  end
end
