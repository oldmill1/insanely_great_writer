class HomeController < ApplicationController
  def index
    @note = Note.order(created_at: :desc).first
    @desktop_shortcuts = Shortcut.order(created_at: :asc).limit(1).map do |shortcut|
      {
        id: shortcut.id,
        x: shortcut.x,
        y: shortcut.y,
        thumbnail: shortcut.thumbnail,
        label: shortcut.label
      }
    end
  end

  def sandbox
    @sandbox_component = params[:id].to_s
  end
end
