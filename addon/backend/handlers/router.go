package handlers

import "github.com/gin-gonic/gin"

func RegisterRoutes(router *gin.Engine, sceneHandler *SceneHandler) {
	hello := NewHelloHandler()
	hello.Register(router)

	sceneHandler.Register(router)
}
